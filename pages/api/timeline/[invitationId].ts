import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireApiAuth } from '@/lib/auth';
import { validate } from '@/lib/validate';
import { withRateLimit } from '@/lib/security/rateLimit';

const cardSchema = z.object({
  text: z.string().trim().min(1).max(120)
});

const timelineSchema = z.object({
  enabled: z.boolean(),
  cards: z.array(cardSchema).min(0).max(7)
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

  const validation = validate(timelineSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.errors });
  }

  const payload = validation.data;

  if (payload.enabled && (payload.cards.length < 5 || payload.cards.length > 7)) {
    return res.status(400).json({ error: 'Timeline needs 5 to 7 cards' });
  }

  const refreshed = await prisma.$transaction(async (tx) => {
    const puzzle = await tx.timelinePuzzle.upsert({
      where: { invitationId },
      update: { enabled: payload.enabled },
      create: { invitationId, enabled: payload.enabled }
    });

    await tx.timelineCard.deleteMany({ where: { puzzleId: puzzle.id } });

    if (payload.cards.length > 0) {
      await tx.timelineCard.createMany({
        data: payload.cards.map((card, index) => ({
          puzzleId: puzzle.id,
          text: card.text.trim(),
          order: index
        }))
      });
    }

    return tx.timelinePuzzle.findUnique({
      where: { id: puzzle.id },
      include: { cards: { orderBy: { order: 'asc' } } }
    });
  });

  if (!refreshed) {
    return res.status(500).json({ error: 'Unable to save timeline' });
  }

  return res.status(200).json({
    id: refreshed.id,
    invitationId,
    enabled: refreshed.enabled,
    cards:
      refreshed.cards.map((card) => ({
        id: card.id,
        text: card.text,
        order: card.order
      }))
  });
}

export default withRateLimit(handler, { windowMs: 60_000, max: 60 });
