import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyFn?: (req: NextApiRequest) => string;
}

interface RateEntry {
  count: number;
  firstRequest: number;
}

const rateStore = new Map<string, RateEntry>();

export function getClientKey(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? 'unknown';
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }
  return req.socket.remoteAddress ?? 'unknown';
}

export function withRateLimit(handler: NextApiHandler, options: RateLimitOptions = { windowMs: 60_000, max: 30 }): NextApiHandler {
  const { windowMs, max, keyFn } = options;

  return async function rateLimitedHandler(req: NextApiRequest, res: NextApiResponse) {
    const key = keyFn ? keyFn(req) : getClientKey(req);
    const now = Date.now();
    const entry = rateStore.get(key);

    if (entry) {
      const delta = now - entry.firstRequest;
      if (delta < windowMs) {
        entry.count += 1;
        if (entry.count > max) {
          res.status(429).json({ error: 'RATE_LIMITED', message: 'Rate limit exceeded. Please try again soon.' });
          return;
        }
      } else {
        rateStore.set(key, { count: 1, firstRequest: now });
      }
    } else {
      rateStore.set(key, { count: 1, firstRequest: now });
    }

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - (rateStore.get(key)?.count ?? 0))));
    res.setHeader('X-RateLimit-Reset', String((rateStore.get(key)?.firstRequest ?? now) + windowMs));

    return handler(req, res);
  };
}

export function resetRateLimits() {
  rateStore.clear();
}
