import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { withRateLimit, getClientKey } from '@/lib/security/rateLimit';
import { validate } from '@/lib/validate';
import { getOrSetGuestKey } from '@/lib/guestKey';

const addSchema = z.object({
  invitationId: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  artist: z.string().trim().max(120).optional().nullable()
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const parsed = validate(addSchema, req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.errors });
  }

  const { invitationId, title, artist } = parsed.data;
  const guestKey = getOrSetGuestKey(req, res);

  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, status: 'published', deletedAt: null },
    select: { id: true }
  });

  if (!invitation) {
    return res.status(404).json({ error: 'Invitation not found' });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const track = await tx.musicTrack.create({
        data: {
          invitationId,
          title: title.trim(),
          artist: artist?.trim() || null,
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
      return res.status(409).json({ error: 'Already used your vote' });
    }
    throw error;
  }

  return res.status(200).json({ ok: true });
}

export default withRateLimit(handler, {
  windowMs: 60_000,
  max: 20,
  keyFn: (req) => req.cookies?.mq_guest ?? getClientKey(req)
});
