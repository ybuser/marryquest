export const TIMELINE_IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type TimelineImageContentType = (typeof TIMELINE_IMAGE_CONTENT_TYPES)[number];

export const MAX_TIMELINE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const TIMELINE_OUTPUT_SIZE_PX = 640;
export const TIMELINE_OUTPUT_QUALITY = 82;
export const MAX_TIMELINE_INPUT_PIXELS = 80_000_000;
export const MAX_TIMELINE_OUTPUT_BYTES = 2 * 1024 * 1024;
export const PRESIGNED_UPLOAD_TTL_SECONDS = 5 * 60;

export interface StorageObjectHead {
  contentLength: number;
  contentType: string | null;
  eTag: string | null;
}

export interface PresignedTemporaryPut {
  uploadUrl: string;
  expiresAt: string;
  headers: {
    'Content-Type': TimelineImageContentType;
  };
}

export interface StorageProvider {
  createPresignedTemporaryPut(
    key: string,
    contentType: TimelineImageContentType,
    expiresInSeconds?: number
  ): Promise<PresignedTemporaryPut>;
  headTemporaryObject(key: string): Promise<StorageObjectHead | null>;
  readTemporaryObject(key: string, head: StorageObjectHead, maxBytes: number): Promise<Buffer>;
  writePublicObject(key: string, body: Buffer): Promise<void>;
  headPublicObject(key: string): Promise<StorageObjectHead | null>;
  deleteTemporaryObject(key: string): Promise<void>;
  publicUrlForKey(key: string): string;
  readiness(): Promise<void>;
}

export type StorageErrorCode =
  | 'STORAGE_CONFIG_INVALID'
  | 'STORAGE_OBJECT_INVALID'
  | 'STORAGE_OBJECT_TOO_LARGE'
  | 'STORAGE_OBJECT_LENGTH_MISMATCH'
  | 'STORAGE_UPLOAD_BUCKET_UNAVAILABLE'
  | 'STORAGE_PUBLIC_BUCKET_UNAVAILABLE'
  | 'STORAGE_UNAVAILABLE';

export class StorageError extends Error {
  constructor(readonly code: StorageErrorCode) {
    super(code);
    this.name = 'StorageError';
  }
}

export function isTimelineImageContentType(value: unknown): value is TimelineImageContentType {
  return (
    typeof value === 'string' &&
    (TIMELINE_IMAGE_CONTENT_TYPES as readonly string[]).includes(value)
  );
}
