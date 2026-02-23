import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireApiAuth } from '@/lib/auth';
import { validate } from '@/lib/validate';
import { withRateLimit } from '@/lib/security/rateLimit';

const optionSchema = z.object({
  label: z.string().trim().min(1).max(80),
  description: z.string().trim().max(200).optional().nullable(),
  isActive: z.boolean().optional().default(true)
});

const payloadSchema = z.object({
  options: z.array(optionSchema).min(2).max(6)
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiAuth(req, res);
  if (!session?.user?.id) return;

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).end('Method Not Allowed');
  }

  const invitationId = req.query.invitationId as string;
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, userId: session.user.id, deletedAt: null },
    select: { id: true }
  });

  if (!invitation) {
    return res.status(404).json({ error: 'Invitation not found' });
  }

  const parsed = validate(payloadSchema, req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.errors });
  }

  const refreshed = await prisma.$transaction(async (tx) => {
    await tx.foodVoteOption.deleteMany({ where: { invitationId } });
    await tx.foodVoteOption.createMany({
      data: parsed.data.options.map((option, index) => ({
        invitationId,
        label: option.label.trim(),
        description: option.description?.trim() || null,
        order: index,
        isActive: option.isActive ?? true
      }))
    });

    return tx.foodVoteOption.findMany({
      where: { invitationId },
      orderBy: { order: 'asc' }
    });
  });

  return res.status(200).json(refreshed);
}

export default withRateLimit(handler, { windowMs: 60_000, max: 60 });
