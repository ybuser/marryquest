const SAFE_SEGMENT_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface ParsedTemporaryTimelineKey {
  userId: string;
  invitationId: string;
  cardId: string;
  uploadId: string;
}

export function isSafeStorageSegment(value: unknown): value is string {
  return typeof value === 'string' && SAFE_SEGMENT_PATTERN.test(value);
}

export function buildTemporaryTimelineKey(
  userId: string,
  invitationId: string,
  cardId: string,
  uploadId: string
): string {
  if (
    !isSafeStorageSegment(userId) ||
    !isSafeStorageSegment(invitationId) ||
    !isSafeStorageSegment(cardId) ||
    !UUID_PATTERN.test(uploadId)
  ) {
    throw new Error('INVALID_TIMELINE_OBJECT_KEY');
  }

  return `tmp/timeline/${userId}/${invitationId}/${cardId}/${uploadId}`;
}

export function parseTemporaryTimelineKey(value: unknown): ParsedTemporaryTimelineKey | null {
  if (typeof value !== 'string') return null;
  const segments = value.split('/');
  if (segments.length !== 6 || segments[0] !== 'tmp' || segments[1] !== 'timeline') return null;

  const [, , userId, invitationId, cardId, uploadId] = segments;
  if (
    !isSafeStorageSegment(userId) ||
    !isSafeStorageSegment(invitationId) ||
    !isSafeStorageSegment(cardId) ||
    !UUID_PATTERN.test(uploadId)
  ) {
    return null;
  }

  const parsed = { userId, invitationId, cardId, uploadId };
  return buildTemporaryTimelineKey(userId, invitationId, cardId, uploadId) === value ? parsed : null;
}

export function buildFinalTimelineKey(parsed: ParsedTemporaryTimelineKey): string {
  return `timeline/${parsed.invitationId}/${parsed.cardId}-${parsed.uploadId}.webp`;
}

export function publicUrlForObjectKey(publicBaseUrl: URL, key: string): string {
  if (!key.startsWith('timeline/')) throw new Error('INVALID_PUBLIC_OBJECT_KEY');
  const encodedKey = key.split('/').map((segment) => encodeURIComponent(segment)).join('/');
  const url = new URL(publicBaseUrl.toString());
  const basePath = url.pathname.replace(/\/+$/, '');
  url.pathname = `${basePath}/${encodedKey}`;
  url.search = '';
  url.hash = '';
  return url.toString();
}
