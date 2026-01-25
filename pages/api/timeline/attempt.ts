import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withRateLimit, getClientKey } from '@/lib/security/rateLimit';
import { validate } from '@/lib/validate';
import { getOrSetGuestKey } from '@/lib/guestKey';

const attemptSchema = z.object({
  invitationId: z.string().min(1),
  cardIds: z.array(z.string().min(1)).min(1).max(7)
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  getOrSetGuestKey(req, res);

  const parsed = validate(attemptSchema, req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.errors });
  }

  const { invitationId, cardIds } = parsed.data;

  const puzzle = await prisma.timelinePuzzle.findUnique({
    where: { invitationId },
    include: {
      invitation: { select: { status: true, deletedAt: true } },
      cards: { orderBy: { correctOrder: 'asc' } }
    }
  });

  if (!puzzle || !puzzle.enabled || puzzle.invitation.status !== 'published' || puzzle.invitation.deletedAt) {
    return res.status(404).json({ error: 'Timeline not available' });
  }

  if (puzzle.cards.length === 0) {
    return res.status(400).json({ error: 'Timeline is not configured' });
  }

  const correctOrder = puzzle.cards.map((card) => card.id);
  const success = cardIds.length === correctOrder.length && cardIds.every((id, index) => id === correctOrder[index]);

  return res.status(200).json({ ok: true, success });
}

export default withRateLimit(handler, {
  windowMs: 60_000,
  max: 20,
  keyFn: (req) => req.cookies?.mq_guest ?? getClientKey(req)
});
