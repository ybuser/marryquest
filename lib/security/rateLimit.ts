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

interface RateStoreState {
  entries: Map<string, RateEntry>;
  requestsSincePrune: number;
  pruneIterator: IterableIterator<[string, RateEntry]> | null;
}

const PRUNE_EVERY_REQUESTS = 64;
const PRUNE_SIZE_THRESHOLD = 256;
const PRUNE_BATCH_SIZE = 32;

const rateStores = new Set<RateStoreState>();

function createRateStore(): RateStoreState {
  const store: RateStoreState = {
    entries: new Map<string, RateEntry>(),
    requestsSincePrune: 0,
    pruneIterator: null
  };
  rateStores.add(store);
  return store;
}

function pruneExpiredEntries(store: RateStoreState, now: number, windowMs: number) {
  store.requestsSincePrune += 1;
  if (store.requestsSincePrune < PRUNE_EVERY_REQUESTS && store.entries.size <= PRUNE_SIZE_THRESHOLD) {
    return;
  }

  store.requestsSincePrune = 0;
  store.pruneIterator ??= store.entries.entries();

  let inspected = 0;
  while (inspected < PRUNE_BATCH_SIZE) {
    const next = store.pruneIterator.next();
    if (next.done) {
      store.pruneIterator = null;
      break;
    }

    inspected += 1;
    const [key, entry] = next.value;
    if (now - entry.firstRequest >= windowMs) {
      store.entries.delete(key);
    }
  }
}

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
  const store = createRateStore();

  return async function rateLimitedHandler(req: NextApiRequest, res: NextApiResponse) {
    const now = Date.now();
    pruneExpiredEntries(store, now, windowMs);

    const clientKey = keyFn ? keyFn(req) : getClientKey(req);
    const method = req.method?.toUpperCase() || 'UNKNOWN';
    const key = `${method}:${clientKey}`;
    const entry = store.entries.get(key);
    let currentEntry: RateEntry;

    if (entry && now - entry.firstRequest < windowMs) {
      entry.count += 1;
      currentEntry = entry;
    } else {
      currentEntry = { count: 1, firstRequest: now };
      store.entries.set(key, currentEntry);
    }

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - currentEntry.count)));
    res.setHeader('X-RateLimit-Reset', String(currentEntry.firstRequest + windowMs));

    if (currentEntry.count > max) {
      res.status(429).json({ error: 'RATE_LIMITED', message: 'Rate limit exceeded. Please try again soon.' });
      return;
    }

    return handler(req, res);
  };
}

export function resetRateLimits() {
  for (const store of rateStores) {
    store.entries.clear();
    store.requestsSincePrune = 0;
    store.pruneIterator = null;
  }
}
