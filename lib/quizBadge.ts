import crypto from 'crypto';
import { isConfiguredServerSecret } from './security/configValue';

const EXPIRATION_MS = 10 * 60 * 1000;

function getSecret() {
  const secret = process.env.QUIZ_BADGE_SECRET;
  if (!isConfiguredServerSecret(secret)) {
    console.error('[quiz-badge] QUIZ_BADGE_SECRET_INVALID');
    return null;
  }
  return secret;
}

export function signBadgeToken(invitationId: string): string | null {
  try {
    const secret = getSecret();
    if (!secret) return null;

    const timestamp = Date.now();
    const payload = `${invitationId}:${timestamp}`;
    const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return Buffer.from(`${payload}:${hmac}`).toString('base64url');
  } catch {
    console.error('[quiz-badge] BADGE_TOKEN_SIGNING_FAILED');
    return null;
  }
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
    if (!secret) return false;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (providedBuffer.length !== expectedBuffer.length) return false;

    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    console.error('[quiz-badge] BADGE_TOKEN_VERIFICATION_FAILED');
    return false;
  }
}
