import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

const COOKIE_NAME = 'mq_guest';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export function getOrSetGuestKey(req: NextApiRequest, res: NextApiResponse): string {
  const existing = req.cookies?.[COOKIE_NAME];
  if (existing) {
    return existing;
  }

  const key = crypto.randomBytes(16).toString('base64url');
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${key}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax; HttpOnly${secureFlag}`
  );
  return key;
}
