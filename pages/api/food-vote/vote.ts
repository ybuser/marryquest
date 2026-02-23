import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { getOrSetGuestKey } from '@/lib/guestKey';
import { withRateLimit, getClientKey } from '@/lib/security/rateLimit';
import { validate } from '@/lib/validate';
import { apiError, methodNotAllowed } from '@/lib/apiError';

const bodySchema = z.object({
  slug: z.string().min(1),
  optionId: z.string().min(1)
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, 'POST');
  }

  const parsed = validate(bodySchema, req.body);
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

  const option = await prisma.foodVoteOption.findFirst({
    where: { id: parsed.data.optionId, invitationId: invitation.id, isActive: true },
    select: { id: true }
  });

  if (!option) {
    return apiError(res, 404, 'NOT_FOUND', 'Option not found');
  }

  const guestKey = getOrSetGuestKey(req, res);

  try {
    await prisma.foodVote.create({
      data: {
        invitationId: invitation.id,
        optionId: option.id,
        voterKey: guestKey
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'ALREADY_VOTED' });
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
