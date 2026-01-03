import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withRateLimit } from '@/lib/security/rateLimit';
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

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: { status: true }
  });

  if (!invitation || invitation.status !== 'published') {
    return res.status(404).json({ error: 'Invitation not available' });
  }

  await prisma.rSVPResponse.create({
    data: {
      invitationId,
      attendeeName,
      attendance,
      guestsCount,
      kidsCount,
      allergiesText
    }
  });

  return res.status(200).json({ ok: true });
}

export default withRateLimit(handler, { windowMs: 60_000, max: 10 });
