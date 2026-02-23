import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { getClientKey, withRateLimit } from '@/lib/security/rateLimit';
import { validate } from '@/lib/validate';
import { signBadgeToken } from '@/lib/quizBadge';
import { getOrSetGuestKey } from '@/lib/guestKey';
import { apiError, methodNotAllowed } from '@/lib/apiError';

const attemptSchema = z.object({
  invitationId: z.string().min(1),
  answers: z.array(z.number().int().min(0).max(3)).min(1).max(5)
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, 'POST');
  }

  getOrSetGuestKey(req, res);

  const parsed = validate(attemptSchema, req.body);
  if (!parsed.success) {
    return apiError(res, 400, 'BAD_REQUEST', parsed.errors.join(', '));
  }

  const { invitationId, answers } = parsed.data;

  const quiz = await prisma.quiz.findUnique({
    where: { invitationId },
    include: {
      invitation: { select: { status: true, deletedAt: true } },
      questions: { orderBy: { order: 'asc' } }
    }
  });

  if (!quiz || !quiz.enabled || quiz.invitation.status !== 'published' || quiz.invitation.deletedAt) {
    return apiError(res, 404, 'NOT_FOUND', 'Quiz not available');
  }

  if (quiz.questions.length === 0) {
    return apiError(res, 400, 'BAD_REQUEST', 'Quiz is not configured');
  }

  if (answers.length !== quiz.questions.length) {
    return apiError(res, 400, 'BAD_REQUEST', 'All questions must be answered');
  }

  const allCorrect = quiz.questions.every((question, index) => question.correctIndex === answers[index]);
  if (!allCorrect) {
    return res.status(200).json({ success: false });
  }

  const badgeToken = signBadgeToken(invitationId);
  return res.status(200).json({ success: true, badgeToken });
}

export default withRateLimit(handler, {
  windowMs: 60_000,
  max: 20,
  keyFn: (req) => req.cookies['mq_guest'] ?? getClientKey(req)
});
