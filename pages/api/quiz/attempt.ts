import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withRateLimit } from '@/lib/security/rateLimit';
import { validate } from '@/lib/validate';
import { signBadgeToken } from '@/lib/quizBadge';

const attemptSchema = z.object({
  invitationId: z.string().min(1),
  answers: z.array(z.number().int().min(0).max(3)).min(1).max(5)
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const parsed = validate(attemptSchema, req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.errors });
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
    return res.status(404).json({ error: 'Quiz not available' });
  }

  if (quiz.questions.length === 0) {
    return res.status(400).json({ error: 'Quiz is not configured' });
  }

  if (answers.length !== quiz.questions.length) {
    return res.status(400).json({ error: 'All questions must be answered' });
  }

  const allCorrect = quiz.questions.every((question, index) => question.correctIndex === answers[index]);
  if (!allCorrect) {
    return res.status(200).json({ success: false });
  }

  const badgeToken = signBadgeToken(invitationId);
  return res.status(200).json({ success: true, badgeToken });
}

export default withRateLimit(handler, { windowMs: 60_000, max: 20 });
