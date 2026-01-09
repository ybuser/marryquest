import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { withRateLimit, getClientKey } from '@/lib/security/rateLimit';
import { getOrSetGuestKey } from '@/lib/guestKey';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  const slug = req.query.slug as string | undefined;
  if (!slug) {
    return res.status(400).json({ error: 'Missing slug' });
  }

  const invitation = await prisma.invitation.findFirst({
    where: { slug, status: 'published', deletedAt: null },
    select: { id: true }
  });

  if (!invitation) {
    return res.status(404).json({ error: 'Invitation not found' });
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
