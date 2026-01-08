import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireApiAuth } from '@/lib/auth';
import { withRateLimit } from '@/lib/security/rateLimit';
import { validate } from '@/lib/validate';

const slugSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens are allowed')
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiAuth(req, res);
  if (!session?.user?.id) return;

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).end('Method Not Allowed');
  }

  const validation = validate(slugSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.errors });
  }

  const invitation = await prisma.invitation.findFirst({
    where: { id: req.query.id as string, deletedAt: null }
  });

  if (!invitation || invitation.userId !== session.user.id) {
    return res.status(404).json({ error: 'Invitation not found' });
  }

  const existing = await prisma.invitation.findUnique({ where: { slug: validation.data.slug } });
  if (existing && existing.id !== invitation.id) {
    return res.status(409).json({ error: 'Slug is already in use' });
  }

  const updated = await prisma.invitation.update({
    where: { id: invitation.id },
    data: { slug: validation.data.slug }
  });

  return res.status(200).json(updated);
}

export default withRateLimit(handler, { windowMs: 60_000, max: 30 });
