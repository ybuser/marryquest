import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { isPublicConfigurationPlaceholder } from './configValue';
import { PASSWORD_MAX_LENGTH, isPasswordHashValid, verifyPassword } from './passwordHash.js';

const OWNER_LOGIN_ID_MIN_LENGTH = 3;
const OWNER_LOGIN_ID_MAX_LENGTH = 128;
const OWNER_NAME_MAX_LENGTH = 100;

const ownerConfigSchema = z.object({
  OWNER_LOGIN_ID: z
    .string()
    .trim()
    .min(OWNER_LOGIN_ID_MIN_LENGTH)
    .max(OWNER_LOGIN_ID_MAX_LENGTH)
    .refine((value) => !isPublicConfigurationPlaceholder(value))
    .transform((value) => value.toLowerCase()),
  OWNER_EMAIL: z.string().trim().toLowerCase().email().max(320),
  OWNER_NAME: z
    .string()
    .optional()
    .transform((value) => {
      const normalized = value?.trim() ?? '';
      return normalized.length > 0 ? normalized : null;
    })
    .refine((value) => value === null || value.length <= OWNER_NAME_MAX_LENGTH),
  OWNER_PASSWORD_HASH: z.string().refine(isPasswordHashValid)
});

export interface OwnerConfig {
  loginId: string;
  email: string;
  name: string | null;
  passwordHash: string;
}

export type OwnerConfigResult = { success: true; config: OwnerConfig } | { success: false };

export type OwnerCredentialResult =
  | { success: true; owner: Pick<OwnerConfig, 'email' | 'name'> }
  | { success: false; reason: 'credentials' | 'configuration' };

export function normalizeOwnerLoginId(value: string): string {
  return value.trim().toLowerCase();
}

export function constantTimeLoginIdEqual(provided: string, configured: string): boolean {
  const providedDigest = createHash('sha256').update(provided, 'utf8').digest();
  const configuredDigest = createHash('sha256').update(configured, 'utf8').digest();
  return timingSafeEqual(providedDigest, configuredDigest);
}

export function loadOwnerConfig(environment: NodeJS.ProcessEnv = process.env): OwnerConfigResult {
  const parsed = ownerConfigSchema.safeParse(environment);
  if (!parsed.success) {
    return { success: false };
  }

  return {
    success: true,
    config: {
      loginId: parsed.data.OWNER_LOGIN_ID,
      email: parsed.data.OWNER_EMAIL,
      name: parsed.data.OWNER_NAME,
      passwordHash: parsed.data.OWNER_PASSWORD_HASH
    }
  };
}

export async function verifyOwnerCredentials(
  loginIdInput: unknown,
  passwordInput: unknown,
  environment: NodeJS.ProcessEnv = process.env
): Promise<OwnerCredentialResult> {
  const loginIdHasSupportedType = typeof loginIdInput === 'string';
  const rawLoginId = loginIdHasSupportedType ? loginIdInput : '';
  const normalizedLoginId =
    rawLoginId.length <= OWNER_LOGIN_ID_MAX_LENGTH ? normalizeOwnerLoginId(rawLoginId) : '';
  const loginIdHasSupportedLength =
    normalizedLoginId.length >= OWNER_LOGIN_ID_MIN_LENGTH &&
    normalizedLoginId.length <= OWNER_LOGIN_ID_MAX_LENGTH;

  const passwordHasSupportedType = typeof passwordInput === 'string';
  const rawPassword = passwordHasSupportedType ? passwordInput : '';
  const passwordHasSupportedLength = rawPassword.length > 0 && rawPassword.length <= PASSWORD_MAX_LENGTH;
  const safePassword = passwordHasSupportedLength ? rawPassword : '';

  const ownerConfig = loadOwnerConfig(environment);
  const configuredLoginId = ownerConfig.success ? ownerConfig.config.loginId : '';
  const loginIdMatches = constantTimeLoginIdEqual(normalizedLoginId, configuredLoginId);
  const passwordMatches = await verifyPassword(safePassword, environment.OWNER_PASSWORD_HASH);

  if (!ownerConfig.success) {
    return { success: false, reason: 'configuration' };
  }

  if (
    !loginIdHasSupportedType ||
    !loginIdHasSupportedLength ||
    !passwordHasSupportedType ||
    !passwordHasSupportedLength ||
    !loginIdMatches ||
    !passwordMatches
  ) {
    return { success: false, reason: 'credentials' };
  }

  return {
    success: true,
    owner: {
      email: ownerConfig.config.email,
      name: ownerConfig.config.name
    }
  };
}
