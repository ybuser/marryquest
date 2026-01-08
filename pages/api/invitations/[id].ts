import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireApiAuth } from '@/lib/auth';
import { withRateLimit } from '@/lib/security/rateLimit';
import { validate } from '@/lib/validate';

const invitationSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  groomName: z.string().min(1).max(120).optional(),
  brideName: z.string().min(1).max(120).optional(),
  dateTime: z.string().datetime().optional(),
  venueName: z.string().min(1).max(200).optional(),
  address: z.string().min(1).max(500).optional(),
  accountGroom: z.string().max(120).nullable().optional(),
  accountBride: z.string().max(120).nullable().optional(),
  contactGroom: z.string().max(120).nullable().optional(),
  contactBride: z.string().max(120).nullable().optional(),
  templateKey: z.enum(['mono', 'editorial', 'film']).optional()
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiAuth(req, res);
  if (!session?.user?.id) return;

  if (req.method !== 'PATCH' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'PATCH,DELETE');
    return res.status(405).end('Method Not Allowed');
  }

  const invitation = await prisma.invitation.findFirst({
    where: { id: req.query.id as string, deletedAt: null }
  });

  if (!invitation || invitation.userId !== session.user.id) {
    return res.status(404).json({ error: 'Invitation not found' });
  }

  if (req.method === 'DELETE') {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { deletedAt: new Date(), status: 'private' }
    });

    return res.status(200).json({ ok: true });
  }

  const validation = validate(invitationSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.errors });
  }

  const data: Record<string, unknown> = { ...validation.data };
  if (data.dateTime && typeof data.dateTime === 'string') {
    data.dateTime = new Date(data.dateTime);
  }

  const updated = await prisma.invitation.update({
    where: { id: invitation.id },
    data
  });

  return res.status(200).json(updated);
}

export default withRateLimit(handler, { windowMs: 60_000, max: 30 });
