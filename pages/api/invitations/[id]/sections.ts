import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireApiAuth } from '@/lib/auth';
import { withRateLimit } from '@/lib/security/rateLimit';
import { validate } from '@/lib/validate';

const sectionsSchema = z.object({
  sections: z
    .array(
      z.object({
        id: z.string(),
        key: z.string(),
        enabled: z.boolean(),
        order: z.number()
      })
    )
    .min(1)
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiAuth(req, res);
  if (!session?.user?.id) return;

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).end('Method Not Allowed');
  }

  const validation = validate(sectionsSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.errors });
  }

  const invitation = await prisma.invitation.findUnique({
    where: { id: req.query.id as string },
    include: { sections: true }
  });

  if (!invitation || invitation.userId !== session.user.id) {
    return res.status(404).json({ error: 'Invitation not found' });
  }

  const incoming = validation.data.sections;

  await Promise.all(
    incoming.map((section) =>
      prisma.sectionConfig.upsert({
        where: { id: section.id },
        update: {
          enabled: section.enabled,
          order: section.order,
          key: section.key
        },
        create: {
          id: section.id,
          invitationId: invitation.id,
          key: section.key,
          enabled: section.enabled,
          order: section.order
        }
      })
    )
  );

  const incomingIds = new Set(incoming.map((section) => section.id));
  const toDelete = invitation.sections.filter((section) => !incomingIds.has(section.id));
  if (toDelete.length) {
    await prisma.sectionConfig.deleteMany({ where: { id: { in: toDelete.map((s) => s.id) } } });
  }

  const refreshed = await prisma.sectionConfig.findMany({
    where: { invitationId: invitation.id },
    orderBy: { order: 'asc' }
  });

  return res.status(200).json(refreshed);
}

export default withRateLimit(handler, { windowMs: 60_000, max: 30 });
