import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireApiAuth } from '@/lib/auth';
import { validate } from '@/lib/validate';
import { withRateLimit } from '@/lib/security/rateLimit';

const optionSchema = z.string().trim().min(1).max(120);

const quizSchema = z.object({
  enabled: z.boolean(),
  questions: z
    .array(
      z.object({
        prompt: z.string().trim().min(1).max(120),
        options: z.array(optionSchema).length(4),
        correctIndex: z.number().int().min(0).max(3)
      })
    )
    .max(5)
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiAuth(req, res);
  if (!session?.user?.id) return;

  if (req.method !== 'PATCH' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET,PATCH');
    return res.status(405).end('Method Not Allowed');
  }

  const invitationId = req.query.invitationId as string;

  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, userId: session.user.id, deletedAt: null },
    select: { userId: true }
  });

  if (!invitation) {
    return res.status(404).json({ error: 'Invitation not found' });
  }

  if (req.method === 'GET') {
    const quiz = await prisma.quiz.findUnique({
      where: { invitationId },
      include: { questions: { orderBy: { order: 'asc' } } }
    });

    return res.status(200).json(quiz ?? null);
  }

  const validation = validate(quizSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.errors });
  }

  const payload = validation.data;
  if (payload.enabled && payload.questions.length === 0) {
    return res.status(400).json({ error: 'Add at least one question to enable the quiz' });
  }

  const existing = await prisma.quiz.findUnique({ where: { invitationId }, include: { questions: true } });

  const baseQuiz = existing
    ? await prisma.quiz.update({ where: { id: existing.id }, data: { enabled: payload.enabled } })
    : await prisma.quiz.create({ data: { invitationId, enabled: payload.enabled } });

  if (existing) {
    await prisma.quizQuestion.deleteMany({ where: { quizId: existing.id } });
  }

  if (payload.questions.length > 0) {
    await prisma.quizQuestion.createMany({
      data: payload.questions.map((question, index) => ({
        quizId: baseQuiz.id,
        prompt: question.prompt.trim(),
        options: question.options.map((option) => option.trim()),
        correctIndex: question.correctIndex,
        order: index
      }))
    });
  }

  const refreshed = await prisma.quiz.findUnique({
    where: { id: baseQuiz.id },
    include: { questions: { orderBy: { order: 'asc' } } }
  });

  return res.status(200).json(refreshed);
}

export default withRateLimit(handler, { windowMs: 60_000, max: 60 });
