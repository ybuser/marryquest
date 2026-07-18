import { randomUUID } from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireApiAuth } from '@/lib/auth';
import {
  MAX_TIMELINE_UPLOAD_BYTES,
  PRESIGNED_UPLOAD_TTL_SECONDS,
  TIMELINE_IMAGE_CONTENT_TYPES,
  buildTemporaryTimelineKey,
  createStorageProvider,
  isSafeStorageSegment
} from '@/lib/storage';

const requestSchema = z
  .object({
    invitationId: z.string().refine(isSafeStorageSegment),
    cardId: z.string().refine(isSafeStorageSegment),
    contentType: z.enum(TIMELINE_IMAGE_CONTENT_TYPES),
    size: z.number().int().min(1).max(MAX_TIMELINE_UPLOAD_BYTES)
  })
  .strict();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  const session = await requireApiAuth(req, res);
  if (!session?.user?.id) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const validation = requestSchema.safeParse(req.body);
  if (!validation.success || !isSafeStorageSegment(session.user.id)) {
    return res.status(400).json({ error: 'Invalid upload request' });
  }

  const { invitationId, cardId, contentType } = validation.data;
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, userId: session.user.id, deletedAt: null },
    select: { id: true }
  });

  if (!invitation) {
    return res.status(404).json({ error: 'Invitation not found' });
  }

  try {
    const uploadKey = buildTemporaryTimelineKey(
      session.user.id,
      invitationId,
      cardId,
      randomUUID()
    );
    const storage = createStorageProvider();
    const presigned = await storage.createPresignedTemporaryPut(
      uploadKey,
      contentType,
      PRESIGNED_UPLOAD_TTL_SECONDS
    );

    return res.status(200).json({ uploadKey, ...presigned });
  } catch {
    console.error('[timeline-upload] PRESIGN_STORAGE_UNAVAILABLE');
    return res.status(502).json({ error: 'Storage unavailable' });
  }
}
