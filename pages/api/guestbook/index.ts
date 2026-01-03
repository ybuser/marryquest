import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withRateLimit } from '@/lib/security/rateLimit';
import { validate } from '@/lib/validate';
import { containsProfanity } from '@/lib/guestbook';
import { requireApiAuth } from '@/lib/auth';

const querySchema = z.object({
  slug: z.string().min(1)
});

const createSchema = z.object({
  invitationId: z.string().min(1),
  nickname: z.string().trim().min(1).max(20),
  message: z.string().trim().min(1).max(300)
});

const patchSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().min(1),
      hidden: z.boolean()
    })
  )
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const parsed = validate(querySchema, req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.errors });
    }

    const invitation = await prisma.invitation.findFirst({
      where: { slug: parsed.data.slug, status: 'published' },
      select: { id: true }
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const entries = await prisma.guestbookEntry.findMany({
      where: { invitationId: invitation.id, hidden: false },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json(
      entries.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString()
      }))
    );
  }

  if (req.method === 'POST') {
    const parsed = validate(createSchema, req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.errors });
    }

    const { invitationId, nickname, message } = parsed.data;

    if (containsProfanity(nickname) || containsProfanity(message)) {
      return res.status(400).json({ error: 'Inappropriate content detected' });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      select: { status: true }
    });

    if (!invitation || invitation.status !== 'published') {
      return res.status(404).json({ error: 'Invitation not available' });
    }

    const created = await prisma.guestbookEntry.create({
      data: {
        invitationId,
        nickname,
        message,
        hidden: false
      }
    });

    return res.status(201).json({
      ...created,
      createdAt: created.createdAt.toISOString()
    });
  }

  if (req.method === 'PATCH') {
    const session = await requireApiAuth(req, res);
    if (!session?.user?.id) return;

    const parsed = validate(patchSchema, req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.errors });
    }

    const updates = parsed.data.updates;
    if (updates.length === 0) {
      return res.status(200).json([]);
    }

    const ids = updates.map((update) => update.id);
    const existing = await prisma.guestbookEntry.findMany({
      where: { id: { in: ids } },
      include: {
        invitation: { select: { userId: true } }
      }
    });

    if (existing.length !== updates.length) {
      return res.status(404).json({ error: 'Some entries were not found' });
    }

    const unauthorized = existing.some((entry) => entry.invitation.userId !== session.user.id);
    if (unauthorized) {
      return res.status(404).json({ error: 'Entries not found' });
    }

    const updateOperations = updates.map((update) =>
      prisma.guestbookEntry.update({ where: { id: update.id }, data: { hidden: update.hidden } })
    );

    const updatedEntries = await prisma.$transaction(updateOperations);
    const invitationId = updatedEntries[0]?.invitationId;

    if (!invitationId) {
      return res.status(200).json([]);
    }

    const refreshed = await prisma.guestbookEntry.findMany({
      where: { invitationId },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json(
      refreshed.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString()
      }))
    );
  }

  res.setHeader('Allow', 'GET,POST,PATCH');
  return res.status(405).end('Method Not Allowed');
}

export default withRateLimit(handler, { windowMs: 60_000, max: 30 });

