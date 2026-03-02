import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { withRateLimit, getClientKey } from '@/lib/security/rateLimit';
import { validate } from '@/lib/validate';
import { getOrSetGuestKey } from '@/lib/guestKey';
import { apiError, methodNotAllowed } from '@/lib/apiError';

const addSchema = z.object({
  invitationId: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  artist: z.string().trim().max(120).optional().nullable()
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, 'POST');
  }

  const parsed = validate(addSchema, req.body);
  if (!parsed.success) {
    return apiError(res, 400, 'BAD_REQUEST', parsed.errors.join(', '));
  }

  const { invitationId, title, artist } = parsed.data;
  const guestKey = getOrSetGuestKey(req, res);

  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, status: 'published', deletedAt: null },
    select: { id: true }
  });

  if (!invitation) {
    return apiError(res, 404, 'NOT_FOUND', 'Invitation not found');
  }

  try {
    await prisma.$transaction(async (tx) => {
      const track = await tx.musicTrack.create({
        data: {
          invitationId,
          title: title.trim(),
          artist: artist?.trim() || '',
          createdByKey: guestKey
        }
      });

      await tx.musicVote.create({
        data: {
          invitationId,
          trackId: track.id,
          voterKey: guestKey
        }
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return apiError(res, 409, 'CONFLICT', 'Already used your vote');
    }
    throw error;
  }

  return res.status(200).json({ ok: true });
}

export default withRateLimit(handler, {
  windowMs: 60_000,
  max: 15,
  keyFn: (req) => req.cookies?.mq_guest ?? getClientKey(req)
});
