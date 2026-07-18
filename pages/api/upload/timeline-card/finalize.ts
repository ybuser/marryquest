import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireApiAuth } from '@/lib/auth';
import {
  MAX_TIMELINE_OUTPUT_BYTES,
  MAX_TIMELINE_UPLOAD_BYTES,
  StorageError,
  buildFinalTimelineKey,
  createStorageProvider,
  createTimelineWebp,
  isSafeStorageSegment,
  isTimelineImageContentType,
  parseTemporaryTimelineKey,
  type StorageProvider
} from '@/lib/storage';

const requestSchema = z
  .object({
    invitationId: z.string().refine(isSafeStorageSegment),
    cardId: z.string().refine(isSafeStorageSegment),
    uploadKey: z.string().min(1).max(768)
  })
  .strict();

async function deleteInvalidTemporaryObject(storage: StorageProvider, uploadKey: string) {
  try {
    await storage.deleteTemporaryObject(uploadKey);
  } catch {
    console.error('[timeline-upload] INVALID_TEMP_DELETE_FAILED');
  }
}

function isInputStorageError(error: unknown): boolean {
  return (
    error instanceof StorageError &&
    (error.code === 'STORAGE_OBJECT_INVALID' ||
      error.code === 'STORAGE_OBJECT_TOO_LARGE' ||
      error.code === 'STORAGE_OBJECT_LENGTH_MISMATCH')
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  const session = await requireApiAuth(req, res);
  if (!session?.user?.id) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const validation = requestSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: 'Invalid upload request' });
  }

  const { invitationId, cardId, uploadKey } = validation.data;
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, userId: session.user.id, deletedAt: null },
    select: { id: true }
  });

  if (!invitation) {
    return res.status(404).json({ error: 'Invitation not found' });
  }

  const parsedKey = parseTemporaryTimelineKey(uploadKey);
  if (
    !parsedKey ||
    parsedKey.userId !== session.user.id ||
    parsedKey.invitationId !== invitationId ||
    parsedKey.cardId !== cardId
  ) {
    return res.status(400).json({ error: 'Invalid upload request' });
  }

  let storage: StorageProvider;
  try {
    storage = createStorageProvider();
  } catch {
    console.error('[timeline-upload] FINALIZE_CONFIGURATION_INVALID');
    return res.status(502).json({ error: 'Storage unavailable' });
  }

  const finalKey = buildFinalTimelineKey(parsedKey);
  try {
    const existingFinal = await storage.headPublicObject(finalKey);
    if (existingFinal) {
      if (
        existingFinal.contentType !== 'image/webp' ||
        existingFinal.contentLength < 1 ||
        existingFinal.contentLength > MAX_TIMELINE_OUTPUT_BYTES
      ) {
        console.error('[timeline-upload] FINAL_OBJECT_INVALID');
        return res.status(502).json({ error: 'Storage unavailable' });
      }
      try {
        await storage.deleteTemporaryObject(uploadKey);
      } catch {
        console.error('[timeline-upload] IDEMPOTENT_TEMP_DELETE_DEFERRED');
      }
      return res.status(200).json({ url: storage.publicUrlForKey(finalKey) });
    }

    const temporaryHead = await storage.headTemporaryObject(uploadKey);
    if (!temporaryHead) {
      return res.status(400).json({ error: 'Invalid upload request' });
    }
    if (
      temporaryHead.contentLength < 1 ||
      temporaryHead.contentLength > MAX_TIMELINE_UPLOAD_BYTES ||
      !isTimelineImageContentType(temporaryHead.contentType)
    ) {
      await deleteInvalidTemporaryObject(storage, uploadKey);
      return res.status(400).json({ error: 'Invalid upload request' });
    }

    let original: Buffer;
    try {
      original = await storage.readTemporaryObject(
        uploadKey,
        temporaryHead,
        MAX_TIMELINE_UPLOAD_BYTES
      );
    } catch (error) {
      if (isInputStorageError(error)) {
        await deleteInvalidTemporaryObject(storage, uploadKey);
        return res.status(400).json({ error: 'Invalid upload request' });
      }
      throw error;
    }

    let optimized: Buffer;
    try {
      optimized = await createTimelineWebp(original, temporaryHead.contentType);
    } catch {
      await deleteInvalidTemporaryObject(storage, uploadKey);
      return res.status(400).json({ error: 'Invalid upload request' });
    }

    try {
      await storage.writePublicObject(finalKey, optimized);
    } catch {
      console.error('[timeline-upload] PUBLIC_WRITE_FAILED');
      return res.status(502).json({ error: 'Storage unavailable' });
    }

    try {
      await storage.deleteTemporaryObject(uploadKey);
    } catch {
      console.error('[timeline-upload] TEMP_DELETE_DEFERRED_TO_LIFECYCLE');
    }

    return res.status(200).json({ url: storage.publicUrlForKey(finalKey) });
  } catch {
    console.error('[timeline-upload] FINALIZE_STORAGE_UNAVAILABLE');
    return res.status(502).json({ error: 'Storage unavailable' });
  }
}
