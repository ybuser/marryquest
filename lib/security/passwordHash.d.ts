export interface ScryptParameters {
  readonly algorithm: 'scrypt';
  readonly version: 'v1';
  readonly N: 16384;
  readonly r: 8;
  readonly p: 1;
  readonly keyLength: 64;
  readonly maxmem: number;
  readonly saltLength: 16;
}

export interface PasswordHashMetadata {
  algorithm: 'scrypt';
  version: 'v1';
  N: 16384;
  r: 8;
  p: 1;
  keyLength: 64;
  saltLength: number;
  derivedKeyLength: 64;
}

export const PASSWORD_MIN_LENGTH: 16;
export const PASSWORD_MAX_LENGTH: 512;
export const SCRYPT_PARAMETERS: ScryptParameters;

export function createPasswordHash(password: string): Promise<string>;
export function getPasswordHashMetadata(encodedHash: unknown): PasswordHashMetadata | null;
export function isPasswordHashValid(encodedHash: unknown): encodedHash is string;
export function verifyPassword(password: unknown, encodedHash: unknown): Promise<boolean>;
