import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { getOrSetGuestKey } from '@/lib/guestKey';
import { getClientKey, withRateLimit } from '@/lib/security/rateLimit';
import { validate } from '@/lib/validate';

const rsvpSchema = z.object({
  invitationId: z.string().min(1),
  attendance: z.enum(['yes', 'no', 'maybe']),
  attendeeName: z.string().trim().min(1).max(40),
  guestsCount: z.number().int().min(0).max(10),
  kidsCount: z.number().int().min(0).max(10),
  allergiesText: z.string().max(120).optional()
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const parsed = validate(rsvpSchema, req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.errors });
  }

  const { invitationId, attendance, attendeeName, guestsCount, kidsCount, allergiesText } = parsed.data;
  const guestKey = getOrSetGuestKey(req, res);

  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, deletedAt: null },
    select: { status: true }
  });

  if (!invitation || invitation.status !== 'published') {
    return res.status(404).json({ error: 'Invitation not available' });
  }

  const existingCount = await prisma.rSVPResponse.count({
    where: { invitationId, voterKey: guestKey }
  });

  if (existingCount >= 2) {
    return res.status(429).json({ error: 'RSVP_LIMIT_REACHED' });
  }

  await prisma.rSVPResponse.create({
    data: {
      invitationId,
      voterKey: guestKey,
      attendeeName,
      attendance,
      guestsCount,
      kidsCount,
      allergiesText
    }
  });

  return res.status(200).json({ ok: true });
}

export default withRateLimit(handler, {
  windowMs: 60_000,
  max: 10,
  keyFn: (req) => req.cookies['mq_guest'] ?? getClientKey(req)
});
