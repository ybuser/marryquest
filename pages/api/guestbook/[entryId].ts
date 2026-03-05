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

  if (req.method !== 'PATCH' && req.method !== 'DELETE') {
    return methodNotAllowed(res, 'PATCH,DELETE');
  }

  const entryId = req.query.entryId as string;
  if (!entryId) {
    return apiError(res, 400, 'BAD_REQUEST', 'Entry id is required');
  }

  const entry = await prisma.guestbookEntry.findUnique({
    where: { id: entryId },
    include: {
      invitation: { select: { userId: true, deletedAt: true } }
    }
  });

  if (!entry || entry.invitation.userId !== session.user.id || entry.invitation.deletedAt) {
    return apiError(res, 404, 'NOT_FOUND', 'Entry not found');
  }

  if (req.method === 'DELETE') {
    await prisma.guestbookEntry.delete({
      where: { id: entry.id }
    });

    return res.status(200).json({ id: entry.id, deleted: true });
  }

  const validation = validate(patchSchema, req.body);
  if (!validation.success) {
    return apiError(res, 400, 'BAD_REQUEST', validation.errors.join(', '));
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
