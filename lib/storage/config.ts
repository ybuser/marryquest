import { z } from 'zod';
import { isConfiguredServerSecret, isPublicConfigurationPlaceholder } from '@/lib/security/configValue';
import { StorageError } from '@/lib/storage/types';

const BUCKET_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,61})[a-z0-9]$/;
const ACCOUNT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export interface StorageConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: URL;
  uploadBucket: string;
  publicBucket: string;
  publicBaseUrl: URL;
  forcePathStyle: boolean;
}

const environmentSchema = z.object({
  R2_ACCOUNT_ID: z.string(),
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
  R2_ENDPOINT: z.string(),
  R2_UPLOAD_BUCKET: z.string(),
  R2_PUBLIC_BUCKET: z.string(),
  R2_PUBLIC_BASE_URL: z.string()
});

function isExactNonPlaceholderValue(value: string): boolean {
  return (
    value.length > 0 &&
    value === value.trim() &&
    !/\s/u.test(value) &&
    !value.toLowerCase().includes('replace-with') &&
    !isPublicConfigurationPlaceholder(value)
  );
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '[::1]' || normalized === '::1';
}

function isReservedInvalidHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === 'invalid' || normalized.endsWith('.invalid');
}

function parseEndpoint(value: string, production: boolean): URL | null {
  if (!isExactNonPlaceholderValue(value)) return null;

  try {
    const parsed = new URL(value);
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
      (parsed.pathname !== '/' && parsed.pathname !== '')
    ) {
      return null;
    }
    return new URL(parsed.origin);
  } catch {
    return null;
  }
}

function parsePublicBaseUrl(value: string, production: boolean): URL | null {
  if (!isExactNonPlaceholderValue(value)) return null;

  try {
    const parsed = new URL(value);
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
      parsed.hash
    ) {
      return null;
    }
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    return parsed;
  } catch {
    return null;
  }
}

export function loadStorageConfig(
  environment: NodeJS.ProcessEnv = process.env,
  production = process.env.NODE_ENV === 'production'
): StorageConfig {
  const parsed = environmentSchema.safeParse(environment);
  if (!parsed.success) throw new StorageError('STORAGE_CONFIG_INVALID');

  const values = parsed.data;
  const endpoint = parseEndpoint(values.R2_ENDPOINT, production);
  const publicBaseUrl = parsePublicBaseUrl(values.R2_PUBLIC_BASE_URL, production);
  const bucketsAreValid =
    isExactNonPlaceholderValue(values.R2_UPLOAD_BUCKET) &&
    isExactNonPlaceholderValue(values.R2_PUBLIC_BUCKET) &&
    BUCKET_NAME_PATTERN.test(values.R2_UPLOAD_BUCKET) &&
    BUCKET_NAME_PATTERN.test(values.R2_PUBLIC_BUCKET) &&
    values.R2_UPLOAD_BUCKET !== values.R2_PUBLIC_BUCKET;
  const endpointMatchesAccount =
    !production ||
    endpoint?.hostname.toLowerCase() ===
      `${values.R2_ACCOUNT_ID.toLowerCase()}.r2.cloudflarestorage.com`;

  if (
    !ACCOUNT_ID_PATTERN.test(values.R2_ACCOUNT_ID) ||
    !isExactNonPlaceholderValue(values.R2_ACCOUNT_ID) ||
    !isConfiguredServerSecret(values.R2_ACCESS_KEY_ID) ||
    !isConfiguredServerSecret(values.R2_SECRET_ACCESS_KEY) ||
    !endpoint ||
    !endpointMatchesAccount ||
    !publicBaseUrl ||
    !bucketsAreValid
  ) {
    throw new StorageError('STORAGE_CONFIG_INVALID');
  }

  return {
    accountId: values.R2_ACCOUNT_ID,
    accessKeyId: values.R2_ACCESS_KEY_ID,
    secretAccessKey: values.R2_SECRET_ACCESS_KEY,
    endpoint,
    uploadBucket: values.R2_UPLOAD_BUCKET,
    publicBucket: values.R2_PUBLIC_BUCKET,
    publicBaseUrl,
    forcePathStyle: !production && isLoopbackHostname(endpoint.hostname)
  };
}
