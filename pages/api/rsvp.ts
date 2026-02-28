import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { getOrSetGuestKey } from '@/lib/guestKey';
import { getClientKey, withRateLimit } from '@/lib/security/rateLimit';
import { validate } from '@/lib/validate';
import { apiError, methodNotAllowed } from '@/lib/apiError';

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
    return methodNotAllowed(res, 'POST');
  }

  const parsed = validate(rsvpSchema, req.body);
  if (!parsed.success) {
    return apiError(res, 400, 'BAD_REQUEST', parsed.errors.join(', '));
  }

  const { invitationId, attendance, attendeeName, guestsCount, kidsCount, allergiesText } = parsed.data;
  const guestKey = getOrSetGuestKey(req, res);

  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, deletedAt: null, status: 'published' },
    select: { id: true }
  });

  if (!invitation) {
    return apiError(res, 404, 'NOT_FOUND', 'Invitation not available');
  }

  const existingCount = await prisma.rSVPResponse.count({
    where: { invitationId, voterKey: guestKey }
  });

  if (existingCount >= 2) {
    return apiError(res, 429, 'RATE_LIMITED', 'RSVP_LIMIT_REACHED');
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
