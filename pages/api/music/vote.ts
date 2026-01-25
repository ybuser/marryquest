import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { withRateLimit, getClientKey } from '@/lib/security/rateLimit';
import { validate } from '@/lib/validate';
import { getOrSetGuestKey } from '@/lib/guestKey';

const voteSchema = z.object({
  invitationId: z.string().min(1),
  trackId: z.string().min(1)
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const parsed = validate(voteSchema, req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.errors });
  }

  const { invitationId, trackId } = parsed.data;
  const guestKey = getOrSetGuestKey(req, res);

  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, status: 'published', deletedAt: null },
    select: { id: true }
  });

  if (!invitation) {
    return res.status(404).json({ error: 'Invitation not found' });
  }

  const track = await prisma.musicTrack.findFirst({
    where: { id: trackId, invitationId },
    select: { id: true }
  });

  if (!track) {
    return res.status(404).json({ error: 'Track not found' });
  }

  try {
    await prisma.musicVote.create({
      data: {
        invitationId,
        trackId,
        voterKey: guestKey
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'Already used your vote' });
    }
    throw error;
  }

  return res.status(200).json({ ok: true });
}

export default withRateLimit(handler, {
  windowMs: 60_000,
  max: 30,
  keyFn: (req) => req.cookies?.mq_guest ?? getClientKey(req)
});
