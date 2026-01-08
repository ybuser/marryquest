import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireApiAuth } from '@/lib/auth';
import { withRateLimit } from '@/lib/security/rateLimit';
import { validate } from '@/lib/validate';

const statusSchema = z.object({
  status: z.enum(['draft', 'published', 'private'])
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiAuth(req, res);
  if (!session?.user?.id) return;

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).end('Method Not Allowed');
  }

  const validation = validate(statusSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.errors });
  }

  const invitation = await prisma.invitation.findFirst({
    where: { id: req.query.id as string, deletedAt: null }
  });

  if (!invitation || invitation.userId !== session.user.id) {
    return res.status(404).json({ error: 'Invitation not found' });
  }

  const updated = await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: validation.data.status }
  });

  return res.status(200).json(updated);
}

export default withRateLimit(handler, { windowMs: 60_000, max: 30 });
