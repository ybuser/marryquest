import type { NextApiRequest, NextApiResponse } from 'next';
import type { GuestbookBadge } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/db';
import { getOrSetGuestKey } from '@/lib/guestKey';
import { getClientKey, withRateLimit } from '@/lib/security/rateLimit';
import { validate } from '@/lib/validate';
import { containsProfanity } from '@/lib/guestbook';
import { requireApiAuth } from '@/lib/auth';
import { verifyBadgeToken } from '@/lib/quizBadge';
import { apiError, methodNotAllowed } from '@/lib/apiError';

const querySchema = z.object({
  slug: z.string().min(1)
});

const createSchema = z.object({
  invitationId: z.string().min(1),
  nickname: z.string().trim().min(1).max(20),
  message: z.string().trim().min(1).max(300),
  badge: z.enum(['quizPerfect']).optional(),
  badgeToken: z.string().optional()
});

const patchSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().min(1),
      hidden: z.boolean()
    })
  )
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const parsed = validate(querySchema, req.query);
    if (!parsed.success) {
      return apiError(res, 400, 'BAD_REQUEST', parsed.errors.join(', '));
    }

    const invitation = await prisma.invitation.findFirst({
      where: { slug: parsed.data.slug, status: 'published', deletedAt: null },
      select: { id: true }
    });

    if (!invitation) {
      return apiError(res, 404, 'NOT_FOUND', 'Invitation not found');
    }

    const entries = await prisma.guestbookEntry.findMany({
      where: { invitationId: invitation.id, hidden: false },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json(
      entries.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString()
      }))
    );
  }

  if (req.method === 'POST') {
    const parsed = validate(createSchema, req.body);
    if (!parsed.success) {
      return apiError(res, 400, 'BAD_REQUEST', parsed.errors.join(', '));
    }

    const { invitationId, nickname, message, badge, badgeToken } = parsed.data;
    const guestKey = getOrSetGuestKey(req, res);

    if (containsProfanity(nickname) || containsProfanity(message)) {
      return apiError(res, 400, 'BAD_REQUEST', 'Inappropriate content detected');
    }

    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, deletedAt: null },
      select: { status: true }
    });

    if (!invitation || invitation.status !== 'published') {
      return apiError(res, 404, 'NOT_FOUND', 'Invitation not available');
    }

    let guestbookBadge: GuestbookBadge = 'none';
    let allowedMax = 1;

    if (badge) {
      if (badge !== 'quizPerfect') {
        return apiError(res, 400, 'BAD_REQUEST', 'Unsupported badge');
      }

      const isValid = verifyBadgeToken(badgeToken ?? '', invitationId);
      if (!isValid) {
        return apiError(res, 401, 'UNAUTHORIZED', 'Invalid or expired badge token');
      }
      guestbookBadge = 'quizPerfect';
      allowedMax = 2;
    }

    const existingCount = await prisma.guestbookEntry.count({
      where: { invitationId, voterKey: guestKey }
    });

    if (existingCount >= allowedMax) {
      return apiError(res, 429, 'RATE_LIMITED', 'GUESTBOOK_LIMIT_REACHED');
    }

    const created = await prisma.guestbookEntry.create({
      data: {
        invitationId,
        voterKey: guestKey,
        nickname,
        message,
        badge: guestbookBadge,
        hidden: false
      }
    });

    return res.status(201).json({
      ...created,
      createdAt: created.createdAt.toISOString()
    });
  }

  if (req.method === 'PATCH') {
    const session = await requireApiAuth(req, res);
    if (!session?.user?.id) return;
    const userId = session.user.id;

    const parsed = validate(patchSchema, req.body);
    if (!parsed.success) {
      return apiError(res, 400, 'BAD_REQUEST', parsed.errors.join(', '));
    }

    const updates = parsed.data.updates;
    if (updates.length === 0) {
      return res.status(200).json([]);
    }

    const ids = updates.map((update) => update.id);
    const existing = await prisma.guestbookEntry.findMany({
      where: { id: { in: ids } },
      include: {
        invitation: { select: { userId: true, deletedAt: true } }
      }
    });

    if (existing.length !== updates.length) {
      return apiError(res, 404, 'NOT_FOUND', 'Some entries were not found');
    }

    const unauthorized = existing.some(
      (entry) => entry.invitation.userId !== userId || entry.invitation.deletedAt
    );
    if (unauthorized) {
      return apiError(res, 404, 'NOT_FOUND', 'Entries not found');
    }

    const updateOperations = updates.map((update) =>
      prisma.guestbookEntry.update({ where: { id: update.id }, data: { hidden: update.hidden } })
    );

    const updatedEntries = await prisma.$transaction(updateOperations);
    const invitationId = updatedEntries[0]?.invitationId;

    if (!invitationId) {
      return res.status(200).json([]);
    }

    const refreshed = await prisma.guestbookEntry.findMany({
      where: { invitationId },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json(
      refreshed.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString()
      }))
    );
  }

  return methodNotAllowed(res, 'GET,POST,PATCH');
}

export default withRateLimit(handler, {
  windowMs: 60_000,
  max: 30,
  keyFn: (req) => req.cookies['mq_guest'] ?? getClientKey(req)
});
