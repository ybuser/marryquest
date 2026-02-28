import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireApiAuth } from '@/lib/auth';
import { withRateLimit, getClientKey } from '@/lib/security/rateLimit';
import { validate } from '@/lib/validate';
import { apiError, methodNotAllowed } from '@/lib/apiError';

const patchSchema = z.object({
  hidden: z.boolean()
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiAuth(req, res);
  if (!session?.user?.id) return;

  if (req.method !== 'PATCH') {
    return methodNotAllowed(res, 'PATCH');
  }

  const validation = validate(patchSchema, req.body);
  if (!validation.success) {
    return apiError(res, 400, 'BAD_REQUEST', validation.errors.join(', '));
  }

  const entry = await prisma.guestbookEntry.findUnique({
    where: { id: req.query.entryId as string },
    include: {
      invitation: { select: { userId: true, deletedAt: true } }
    }
  });

  if (!entry || entry.invitation.userId !== session.user.id || entry.invitation.deletedAt) {
    return apiError(res, 404, 'NOT_FOUND', 'Entry not found');
  }

  const updated = await prisma.guestbookEntry.update({
    where: { id: entry.id },
    data: { hidden: validation.data.hidden }
  });

  return res.status(200).json({
    ...updated,
    createdAt: updated.createdAt.toISOString()
  });
}

export default withRateLimit(handler, {
  windowMs: 60_000,
  max: 30,
  keyFn: (req) => req.cookies['mq_guest'] ?? getClientKey(req)
});
