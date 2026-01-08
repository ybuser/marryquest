import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireApiAuth } from '@/lib/auth';
import { validate } from '@/lib/validate';

const querySchema = z.object({
  invitationId: z.string().min(1)
});

function toCsv(rows: string[][]): string {
  return rows
    .map((columns) =>
      columns
        .map((value) => {
          const safe = value ?? '';
          if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
            return `"${safe.replace(/"/g, '""')}"`;
          }
          return safe;
        })
        .join(',')
    )
    .join('\n');
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiAuth(req, res);
  if (!session?.user?.id) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  const parsed = validate(querySchema, req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.errors });
  }

  const { invitationId } = parsed.data;

  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, deletedAt: null },
    select: { id: true, userId: true }
  });

  if (!invitation) {
    return res.status(404).json({ error: 'Invitation not found' });
  }

  if (invitation.userId !== session.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const rows = await prisma.rSVPResponse.findMany({
    where: { invitationId },
    orderBy: { createdAt: 'desc' },
    select: {
      attendeeName: true,
      createdAt: true,
      attendance: true,
      guestsCount: true,
      kidsCount: true,
      allergiesText: true
    }
  });

  const csv = toCsv([
    ['createdAt', 'attendeeName', 'attendance', 'guestsCount', 'kidsCount', 'allergiesText'],
    ...rows.map((row) => [
      row.createdAt.toISOString(),
      row.attendeeName,
      row.attendance,
      row.guestsCount.toString(),
      row.kidsCount.toString(),
      row.allergiesText ?? ''
    ])
  ]);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="rsvp-${invitationId}.csv"`);

  return res.status(200).send(`\uFEFF${csv}`);
}

export default handler;
