import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withRateLimit, getClientKey } from '@/lib/security/rateLimit';
import { getOrSetGuestKey } from '@/lib/guestKey';
import { validate } from '@/lib/validate';
import { apiError, methodNotAllowed } from '@/lib/apiError';

const querySchema = z.object({
  slug: z.string().min(1)
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, 'GET');
  }

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

  const guestKey = getOrSetGuestKey(req, res);

  const tracks = await prisma.musicTrack.findMany({
    where: { invitationId: invitation.id },
    include: { _count: { select: { votes: true } } },
    orderBy: { createdAt: 'asc' }
  });

  const alreadyUsed = await prisma.musicVote.findFirst({
    where: { invitationId: invitation.id, voterKey: guestKey },
    select: { id: true }
  });

  return res.status(200).json({
    tracks: tracks.map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      url: track.url,
      voteCount: track._count.votes
    })),
    alreadyUsed: Boolean(alreadyUsed)
  });
}

export default withRateLimit(handler, {
  windowMs: 60_000,
  max: 60,
  keyFn: (req) => req.cookies?.mq_guest ?? getClientKey(req)
});
