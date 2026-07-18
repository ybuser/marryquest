import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireApiAuth } from '@/lib/auth';
import { validate } from '@/lib/validate';
import { withRateLimit } from '@/lib/security/rateLimit';
import {
  createStorageProvider,
  loadStorageConfig,
  parseRecognizedTimelinePublicUrl
} from '@/lib/storage';

const cardSchema = z.object({
  text: z.string().trim().min(1).max(120),
  description: z.string().trim().max(240).optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  correctOrder: z.number().int().min(0)
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
    select: {
      id: true,
      timelinePuzzle: {
        select: { cards: { select: { photoUrl: true } } }
      }
    }
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

  if (payload.enabled) {
    const correctOrders = payload.cards.map((card) => card.correctOrder);
    const uniqueOrders = new Set(correctOrders);
    if (uniqueOrders.size !== payload.cards.length) {
      return res.status(400).json({ error: 'Correct order values must be unique' });
    }
    const maxOrder = Math.max(...correctOrders);
    if (maxOrder >= payload.cards.length) {
      return res.status(400).json({ error: 'Correct order values must be within card range' });
    }
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
          description: card.description?.trim() || "",
          photoUrl: card.photoUrl ?? null,
          order: index,
          correctOrder: card.correctOrder
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

  const previousPhotoUrls = invitation.timelinePuzzle?.cards
    .map((card) => card.photoUrl)
    .filter((value): value is string => Boolean(value)) ?? [];

  if (previousPhotoUrls.length > 0) {
    try {
      const storageConfig = loadStorageConfig();
      const storage = createStorageProvider(storageConfig);
      const currentTimeline = await prisma.timelinePuzzle.findUnique({
        where: { id: refreshed.id },
        select: {
          cards: {
            orderBy: { order: 'asc' },
            select: { id: true, photoUrl: true }
          }
        }
      });
      const savedCardIds = refreshed.cards.map((card) => card.id);
      const currentCardIds = currentTimeline?.cards.map((card) => card.id) ?? [];
      const savedRevisionIsCurrent =
        savedCardIds.length === currentCardIds.length &&
        savedCardIds.every((id, index) => id === currentCardIds[index]);

      if (!savedRevisionIsCurrent) {
        console.error('[timeline-assets] SAVED_ASSET_CLEANUP_STALE_REVISION');
      } else {
        const retainedKeys = new Set(
          (currentTimeline?.cards ?? [])
            .map((card) =>
              card.photoUrl
                ? parseRecognizedTimelinePublicUrl(
                    card.photoUrl,
                    storageConfig.publicBaseUrl,
                    invitationId
                  )
                : null
            )
            .filter((key): key is string => Boolean(key))
        );
        const removedKeys = [
          ...new Set(
            previousPhotoUrls
              .map((url) =>
                parseRecognizedTimelinePublicUrl(url, storageConfig.publicBaseUrl, invitationId)
              )
              .filter((key): key is string => key !== null && !retainedKeys.has(key))
          )
        ];

        const cleanupResults = await Promise.allSettled(
          removedKeys.map(async (key) => {
            const publicUrl = storage.publicUrlForKey(key);
            const currentReferenceCount = await prisma.timelineCard.count({
              where: { photoUrl: publicUrl }
            });
            if (currentReferenceCount === 0) {
              await storage.deleteRecognizedPublicObject(key);
            }
          })
        );
        if (cleanupResults.some((result) => result.status === 'rejected')) {
          console.error('[timeline-assets] SAVED_ASSET_CLEANUP_FAILED');
        }
      }
    } catch {
      console.error('[timeline-assets] SAVED_ASSET_CLEANUP_SKIPPED');
    }
  }

  return res.status(200).json({
    id: refreshed.id,
    invitationId,
    enabled: refreshed.enabled,
    cards:
      refreshed.cards.map((card) => ({
        id: card.id,
        text: card.text,
        description: card.description,
        photoUrl: card.photoUrl,
        order: card.order,
        correctOrder: card.correctOrder
      }))
  });
}

export default withRateLimit(handler, { windowMs: 60_000, max: 60 });
