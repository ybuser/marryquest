import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { getOrSetGuestKey } from '@/lib/guestKey';
import { withRateLimit, getClientKey } from '@/lib/security/rateLimit';
import { validate } from '@/lib/validate';
import { apiError, methodNotAllowed } from '@/lib/apiError';

const querySchema = z.object({ slug: z.string().min(1) });

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

  const options = await prisma.foodVoteOption.findMany({
    where: { invitationId: invitation.id, isActive: true },
    orderBy: { order: 'asc' },
    select: { id: true, label: true, description: true, order: true }
  });

  const grouped = await prisma.foodVote.groupBy({
    by: ['optionId'],
    where: { invitationId: invitation.id },
    _count: { _all: true }
  });

  const voteMap = new Map(grouped.map((row) => [row.optionId, row._count._all]));

  const existingVote = await prisma.foodVote.findFirst({
    where: { invitationId: invitation.id, voterKey: guestKey },
    select: { optionId: true }
  });

  return res.status(200).json({
    options: options.map((option) => ({ ...option, votes: voteMap.get(option.id) ?? 0 })),
    alreadyVoted: Boolean(existingVote),
    votedOptionId: existingVote?.optionId
  });
}

export default withRateLimit(handler, {
  windowMs: 60_000,
  max: 60,
  keyFn: (req) => req.cookies?.mq_guest ?? getClientKey(req)
});
