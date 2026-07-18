import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withRateLimit, getClientKey } from '@/lib/security/rateLimit';
import { validate } from '@/lib/validate';
import { getOrSetGuestKey } from '@/lib/guestKey';
import { apiError, methodNotAllowed } from '@/lib/apiError';
import { isTimelineReady } from '@/lib/timeline/readiness';

const attemptSchema = z.object({
  invitationId: z.string().min(1),
  cardIds: z.array(z.string().min(1)).min(1).max(7)
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, 'POST');
  }

  getOrSetGuestKey(req, res);

  const parsed = validate(attemptSchema, req.body);
  if (!parsed.success) {
    return apiError(res, 400, 'BAD_REQUEST', parsed.errors.join(', '));
  }

  const { invitationId, cardIds } = parsed.data;

  const puzzle = await prisma.timelinePuzzle.findUnique({
    where: { invitationId },
    include: {
      invitation: { select: { status: true, deletedAt: true } },
      cards: { orderBy: { correctOrder: 'asc' } }
    }
  });

  if (
    !puzzle ||
    !puzzle.enabled ||
    puzzle.invitation.status !== 'published' ||
    puzzle.invitation.deletedAt ||
    !isTimelineReady(puzzle.cards)
  ) {
    return apiError(res, 404, 'NOT_FOUND', 'Timeline not available');
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
