function isLoopbackHostname(hostname) {
  const normalized = hostname.toLowerCase();
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '[::1]' || normalized === '::1';
}

function isReservedInvalidHostname(hostname) {
  const normalized = hostname.toLowerCase();
  return normalized === 'invalid' || normalized.endsWith('.invalid');
}

function parseStorageUrl(value, allowPath) {
  if (
    !value ||
    value !== value.trim() ||
    /\s/u.test(value) ||
    /replace-with|account_id/i.test(value)
  ) {
    return null;
  }

  try {
    const parsed = new URL(value);
    const production = process.env.NODE_ENV === 'production';
    const protocolAllowed =
      parsed.protocol === 'https:' ||
      (!production && parsed.protocol === 'http:' && isLoopbackHostname(parsed.hostname));
    if (
      !protocolAllowed ||
      !parsed.hostname ||
      isReservedInvalidHostname(parsed.hostname) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      (!allowPath && parsed.pathname !== '/' && parsed.pathname !== '')
    ) {
      return null;
    }
    parsed.pathname = allowPath ? parsed.pathname.replace(/\/+$/, '') : '/';
    return parsed;
  } catch {
    return null;
  }
}

const r2Endpoint = parseStorageUrl(process.env.R2_ENDPOINT, false);
const r2PublicBaseUrl = parseStorageUrl(process.env.R2_PUBLIC_BASE_URL, true);
const r2UploadBucket = process.env.R2_UPLOAD_BUCKET;
const validUploadBucket =
  typeof r2UploadBucket === 'string' &&
  /^[a-z0-9](?:[a-z0-9-]{1,61})[a-z0-9]$/.test(r2UploadBucket) &&
  !r2UploadBucket.toLowerCase().includes('replace-with');

const uploadOrigins = [];
if (r2Endpoint) {
  uploadOrigins.push(r2Endpoint.origin);
  if (validUploadBucket && r2Endpoint.hostname.endsWith('.r2.cloudflarestorage.com')) {
    uploadOrigins.push(
      `${r2Endpoint.protocol}//${r2UploadBucket}.${r2Endpoint.hostname}${r2Endpoint.port ? `:${r2Endpoint.port}` : ''}`
    );
  }
}

const scriptSource = process.env.NODE_ENV === 'development'
  ? "script-src 'self' 'unsafe-eval'"
  : "script-src 'self'";

/** @type {import('next').NextConfig} */
const ContentSecurityPolicy = [
  "default-src 'self'",
  scriptSource,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://images.unsplash.com${r2PublicBaseUrl ? ` ${r2PublicBaseUrl.origin}` : ''}`,
  `connect-src 'self'${uploadOrigins.length > 0 ? ` ${[...new Set(uploadOrigins)].join(' ')}` : ''}`,
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'Referrer-Policy',
    value: 'no-referrer'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com'
      },
      ...(r2PublicBaseUrl
        ? [
            {
              protocol: r2PublicBaseUrl.protocol.slice(0, -1),
              hostname: r2PublicBaseUrl.hostname,
              ...(r2PublicBaseUrl.port ? { port: r2PublicBaseUrl.port } : {}),
              pathname: `${r2PublicBaseUrl.pathname.replace(/\/+$/, '')}/timeline/**`
            }
          ]
        : [])
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders
      }
    ];
  }
};

module.exports = nextConfig;
