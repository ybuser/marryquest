import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { apiError, methodNotAllowed } from '@/lib/apiError';
import { verifyAdminPassphrase } from '@/lib/security/adminPassphrase';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, 'GET');
  }

  if (!verifyAdminPassphrase(req.headers['x-admin-passphrase'])) {
    return apiError(res, 401, 'UNAUTHORIZED');
  }

  const invitationId = req.query.id;
  if (typeof invitationId !== 'string' || !invitationId) {
    return apiError(res, 400, 'BAD_REQUEST', 'Invitation id is required');
  }

  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, deletedAt: null },
    select: { id: true }
  });

  if (!invitation) {
    return apiError(res, 404, 'NOT_FOUND', 'Invitation not found');
  }

  const [guestbookTotal, guestbookHidden, rsvpTotal, rsvpByAttendance, quizPerfectCount, musicTracksCount, musicVotesCount] =
    await Promise.all([
      prisma.guestbookEntry.count({ where: { invitationId } }),
      prisma.guestbookEntry.count({ where: { invitationId, hidden: true } }),
      prisma.rSVPResponse.count({ where: { invitationId } }),
      prisma.rSVPResponse.groupBy({ by: ['attendance'], where: { invitationId }, _count: { _all: true } }),
      prisma.guestbookEntry.count({ where: { invitationId, badge: 'quizPerfect' } }),
      prisma.musicTrack.count({ where: { invitationId } }),
      prisma.musicVote.count({ where: { invitationId } })
    ]);

  const rsvpBreakdown = rsvpByAttendance.reduce<Record<string, number>>((acc, row) => {
    acc[row.attendance] = row._count._all;
    return acc;
  }, {});

  return res.status(200).json({
    invitationId,
    guestbookTotal,
    guestbookHidden,
    rsvpTotal,
    rsvpBreakdown,
    quizAttempts: null,
    quizPerfectCount,
    timelineSuccessCount: null,
    musicTracksCount,
    musicVotesCount
  });
}

export default handler;
