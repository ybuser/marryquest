import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  intervalMs: number;
  max: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

const getClientIp = (req: NextApiRequest) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0] || 'unknown';
  }
  return req.socket.remoteAddress || 'unknown';
};

export const withRateLimit = (
  handler: NextApiHandler,
  { intervalMs, max }: RateLimitOptions
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const ip = getClientIp(req);
    const now = Date.now();
    const entry = rateLimitStore.get(ip);

    if (!entry || entry.resetAt <= now) {
      rateLimitStore.set(ip, { count: 1, resetAt: now + intervalMs });
    } else {
      entry.count += 1;
      if (entry.count > max) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());
        res.status(429).json({ error: 'Too many requests' });
        return;
      }
    }

    // TODO: Replace with a shared store (Redis, Upstash) for production scale.
    await handler(req, res);
  };
};
