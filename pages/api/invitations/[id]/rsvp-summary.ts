import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireApiAuth } from '@/lib/auth';
import { validate } from '@/lib/validate';

const paramsSchema = z.object({
  id: z.string().min(1)
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiAuth(req, res);
  if (!session?.user?.id) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  const parsed = validate(paramsSchema, req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.errors });
  }

  const { id } = parsed.data;

  const invitation = await prisma.invitation.findUnique({
    where: { id },
    select: { id: true, userId: true }
  });

  if (!invitation) {
    return res.status(404).json({ error: 'Invitation not found' });
  }

  if (invitation.userId !== session.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const [attendanceCounts, aggregates, recent] = await Promise.all([
    prisma.rSVPResponse.groupBy({
      by: ['attendance'],
      _count: true,
      where: { invitationId: id }
    }),
    prisma.rSVPResponse.aggregate({
      where: { invitationId: id },
      _sum: { guestsCount: true, kidsCount: true },
      _count: true
    }),
    prisma.rSVPResponse.findMany({
      where: { invitationId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true }
    })
  ]);

  const countsByAttendance: Record<'yes' | 'no' | 'maybe', number> = {
    yes: 0,
    no: 0,
    maybe: 0
  };

  attendanceCounts.forEach((item) => {
    countsByAttendance[item.attendance] = item._count;
  });

  const response = {
    countsByAttendance,
    totals: {
      guestsTotal: aggregates._sum.guestsCount ?? 0,
      kidsTotal: aggregates._sum.kidsCount ?? 0,
      responsesTotal: aggregates._count
    },
    recentSampleCount: recent.length
  };

  return res.status(200).json(response);
}

export default handler;
