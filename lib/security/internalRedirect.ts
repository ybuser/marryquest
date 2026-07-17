export const DEFAULT_AUTHENTICATED_PATH = '/dashboard';

const DUMMY_ORIGIN = 'https://marryquest.invalid';
const UNSAFE_CHARACTER_PATTERN = /[\\\u0000-\u001f\u007f]|%5c/i;

function parseTrustedBaseUrl(baseUrl: unknown): URL {
  if (typeof baseUrl === 'string') {
    try {
      const parsed = new URL(baseUrl);
      if (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        parsed.hostname &&
        !parsed.username &&
        !parsed.password
      ) {
        return new URL(parsed.origin);
      }
    } catch {
      // Fall through to the fixed, non-routable origin.
    }
  }

  return new URL(DUMMY_ORIGIN);
}

export function sanitizeInternalCallbackUrl(
  candidate: unknown,
  baseUrl?: unknown
): string {
  if (typeof candidate !== 'string' || candidate.length === 0 || candidate !== candidate.trim()) {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  if (UNSAFE_CHARACTER_PATTERN.test(candidate) || candidate.startsWith('//')) {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  const trustedBase = parseTrustedBaseUrl(baseUrl);
  const isRootRelative = candidate.startsWith('/');
  const isHttpUrl = /^https?:\/\//i.test(candidate);
  if (!isRootRelative && !isHttpUrl) {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  try {
    const parsed = new URL(candidate, trustedBase);
    if (
      parsed.origin !== trustedBase.origin ||
      parsed.username ||
      parsed.password ||
      parsed.pathname.startsWith('//')
    ) {
      return DEFAULT_AUTHENTICATED_PATH;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_AUTHENTICATED_PATH;
  }
}

export const sanitizeInternalRedirect = sanitizeInternalCallbackUrl;

export function toSafeAbsoluteRedirect(candidate: unknown, baseUrl: string): string {
  try {
    const trustedBase = new URL(baseUrl);
    if (
      (trustedBase.protocol !== 'http:' && trustedBase.protocol !== 'https:') ||
      !trustedBase.hostname ||
      trustedBase.username ||
      trustedBase.password
    ) {
      return DEFAULT_AUTHENTICATED_PATH;
    }

    const safePath = sanitizeInternalCallbackUrl(candidate, trustedBase.origin);
    return new URL(safePath, trustedBase.origin).toString();
  } catch {
    return DEFAULT_AUTHENTICATED_PATH;
  }
}
