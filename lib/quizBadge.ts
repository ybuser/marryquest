import crypto from 'crypto';

const EXPIRATION_MS = 10 * 60 * 1000;

function getSecret() {
  const secret = process.env.QUIZ_BADGE_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('Missing QUIZ_BADGE_SECRET');
  }
  return secret;
}

export function signBadgeToken(invitationId: string): string {
  const timestamp = Date.now();
  const payload = `${invitationId}:${timestamp}`;
  const secret = getSecret();
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64url');
}

export function verifyBadgeToken(token: string, invitationId: string): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [tokenInvitationId, timestampStr, signature] = decoded.split(':');
    if (!tokenInvitationId || !timestampStr || !signature) return false;
    if (tokenInvitationId !== invitationId) return false;

    const timestamp = Number(timestampStr);
    if (Number.isNaN(timestamp)) return false;
    if (Date.now() - timestamp > EXPIRATION_MS) return false;

    const payload = `${tokenInvitationId}:${timestamp}`;
    const secret = getSecret();
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (providedBuffer.length !== expectedBuffer.length) return false;

    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  } catch (error) {
    console.error('Failed to verify badge token', error);
    return false;
  }
}
