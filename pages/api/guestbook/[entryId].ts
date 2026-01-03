import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireApiAuth } from '@/lib/auth';
import { withRateLimit } from '@/lib/security/rateLimit';
import { validate } from '@/lib/validate';

const patchSchema = z.object({
  hidden: z.boolean()
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiAuth(req, res);
  if (!session?.user?.id) return;

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).end('Method Not Allowed');
  }

  const validation = validate(patchSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.errors });
  }

  const entry = await prisma.guestbookEntry.findUnique({
    where: { id: req.query.entryId as string },
    include: {
      invitation: { select: { userId: true } }
    }
  });

  if (!entry || entry.invitation.userId !== session.user.id) {
    return res.status(404).json({ error: 'Entry not found' });
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

export default withRateLimit(handler, { windowMs: 60_000, max: 30 });

