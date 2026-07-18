import sharp from 'sharp';
import {
  MAX_TIMELINE_INPUT_PIXELS,
  MAX_TIMELINE_OUTPUT_BYTES,
  TIMELINE_OUTPUT_QUALITY,
  TIMELINE_OUTPUT_SIZE_PX,
  type TimelineImageContentType
} from '@/lib/storage/types';

const FORMAT_FOR_CONTENT_TYPE: Record<TimelineImageContentType, 'jpeg' | 'png' | 'webp'> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp'
};

const SHARP_INPUT_OPTIONS = {
  failOn: 'warning' as const,
  limitInputPixels: MAX_TIMELINE_INPUT_PIXELS,
  pages: 1
};

export async function createTimelineWebp(
  input: Buffer,
  declaredContentType: TimelineImageContentType
): Promise<Buffer> {
  const metadata = await sharp(input, SHARP_INPUT_OPTIONS).metadata();
  if (
    metadata.format !== FORMAT_FOR_CONTENT_TYPE[declaredContentType] ||
    !metadata.width ||
    !metadata.height ||
    (metadata.pages ?? 1) !== 1
  ) {
    throw new Error('INVALID_TIMELINE_IMAGE');
  }

  const output = await sharp(input, SHARP_INPUT_OPTIONS)
    .rotate()
    .resize(TIMELINE_OUTPUT_SIZE_PX, TIMELINE_OUTPUT_SIZE_PX, {
      fit: 'cover',
      position: 'attention'
    })
    .webp({ quality: TIMELINE_OUTPUT_QUALITY })
    .toBuffer({ resolveWithObject: true });

  if (
    output.info.format !== 'webp' ||
    output.info.width !== TIMELINE_OUTPUT_SIZE_PX ||
    output.info.height !== TIMELINE_OUTPUT_SIZE_PX ||
    output.data.length > MAX_TIMELINE_OUTPUT_BYTES
  ) {
    throw new Error('INVALID_TIMELINE_IMAGE_OUTPUT');
  }

  return output.data;
}
