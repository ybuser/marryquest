import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { type File } from 'formidable';
import { readFile } from 'fs/promises';
import sharp from 'sharp';
import prisma from '@/lib/db';
import { requireApiAuth } from '@/lib/auth';

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const OUTPUT_SIZE_PX = 640;
const OUTPUT_QUALITY = 82;

export const config = {
  api: {
    bodyParser: false
  }
};

async function parseForm(req: NextApiRequest): Promise<{ fields: formidable.Fields; file: File }> {
  const form = formidable({ maxFileSize: MAX_SIZE_BYTES, multiples: false });

  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }
      const fileField = files.file;
      const file = Array.isArray(fileField) ? fileField[0] : fileField;
      if (!file) {
        reject(new Error('File is required'));
        return;
      }
      resolve({ fields, file });
    });
  });
}

function getFirstField(fields: formidable.Fields, key: string) {
  const value = fields[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

async function toTimelineSquareWebp(input: Buffer) {
  return sharp(input)
    .rotate()
    .resize(OUTPUT_SIZE_PX, OUTPUT_SIZE_PX, { fit: 'cover', position: 'attention' })
    .webp({ quality: OUTPUT_QUALITY })
    .toBuffer();
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiAuth(req, res);
  if (!session?.user?.id) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'timeline';

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Storage configuration missing' });
  }

  try {
    const { fields, file } = await parseForm(req);
    const invitationId = getFirstField(fields, 'invitationId');
    const cardId = getFirstField(fields, 'cardId');

    if (!invitationId || !cardId) {
      return res.status(400).json({ error: 'Missing invitationId or cardId' });
    }

    const safeCardId = cardId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeCardId) {
      return res.status(400).json({ error: 'Invalid card id' });
    }

    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, userId: session.user.id, deletedAt: null },
      select: { id: true }
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (!file.mimetype || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return res.status(400).json({ error: 'File too large' });
    }

    const objectPath = `timeline/${invitationId}/${safeCardId}-${Date.now()}.webp`;
    const fileBuffer = await readFile(file.filepath);
    const processedBuffer = await toTimelineSquareWebp(fileBuffer);

    const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
        'Content-Type': 'image/webp',
        'x-upsert': 'true'
      },
      body: processedBuffer
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      return res.status(500).json({ error: errorText || 'Upload failed' });
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
    return res.status(200).json({ url: publicUrl });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to upload file' });
  }
}

export default handler;
