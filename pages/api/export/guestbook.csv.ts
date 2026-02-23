import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireApiAuth } from '@/lib/auth';
import { validate } from '@/lib/validate';
import { apiError, methodNotAllowed, toYmd } from '@/lib/apiError';
import { toCsv, withBom } from '@/lib/csv';

const querySchema = z.object({
  invitationId: z.string().min(1)
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiAuth(req, res);
  if (!session?.user?.id) return;

  if (req.method !== 'GET') {
    return methodNotAllowed(res, 'GET');
  }

  const parsed = validate(querySchema, req.query);
  if (!parsed.success) {
    return apiError(res, 400, 'BAD_REQUEST', parsed.errors.join(', '));
  }

  const invitation = await prisma.invitation.findFirst({
    where: { id: parsed.data.invitationId, deletedAt: null },
    select: { id: true, userId: true, slug: true }
  });

  if (!invitation) {
    return apiError(res, 404, 'NOT_FOUND', 'Invitation not found');
  }

  if (invitation.userId !== session.user.id) {
    return apiError(res, 401, 'UNAUTHORIZED');
  }

  const entries = await prisma.guestbookEntry.findMany({
    where: { invitationId: invitation.id },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, nickname: true, message: true, badge: true, hidden: true }
  });

  const csv = toCsv([
    ['createdAt', 'nickname', 'message', 'badge', 'hidden'],
    ...entries.map((entry) => [
      entry.createdAt.toISOString(),
      entry.nickname,
      entry.message,
      entry.badge,
      String(entry.hidden)
    ])
  ]);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="guestbook_${invitation.slug}_${toYmd()}.csv"`);

  return res.status(200).send(withBom(csv));
}

export default handler;
