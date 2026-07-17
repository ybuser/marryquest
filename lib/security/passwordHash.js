'use strict';

const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');

const PASSWORD_MIN_LENGTH = 16;
const PASSWORD_MAX_LENGTH = 512;
const MAX_ENCODED_HASH_LENGTH = 512;
const MIN_SALT_LENGTH = 16;
const MAX_SALT_LENGTH = 64;

const SCRYPT_PARAMETERS = Object.freeze({
  algorithm: 'scrypt',
  version: 'v1',
  N: 16384,
  r: 8,
  p: 1,
  keyLength: 64,
  maxmem: 64 * 1024 * 1024,
  saltLength: 16
});

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

function decodeCanonicalBase64Url(value, minimumLength, maximumLength) {
  if (typeof value !== 'string' || !BASE64URL_PATTERN.test(value)) {
    return null;
  }

  const decoded = Buffer.from(value, 'base64url');
  if (
    decoded.length < minimumLength ||
    decoded.length > maximumLength ||
    decoded.toString('base64url') !== value
  ) {
    return null;
  }

  return decoded;
}

function formatPasswordHash(salt, derivedKey) {
  return [
    SCRYPT_PARAMETERS.algorithm,
    SCRYPT_PARAMETERS.version,
    String(SCRYPT_PARAMETERS.N),
    String(SCRYPT_PARAMETERS.r),
    String(SCRYPT_PARAMETERS.p),
    String(SCRYPT_PARAMETERS.keyLength),
    salt.toString('base64url'),
    derivedKey.toString('base64url')
  ].join('$');
}

function parsePasswordHash(encodedHash) {
  if (
    typeof encodedHash !== 'string' ||
    encodedHash.length === 0 ||
    encodedHash.length > MAX_ENCODED_HASH_LENGTH
  ) {
    return null;
  }

  const fields = encodedHash.split('$');
  if (fields.length !== 8) {
    return null;
  }

  const [algorithm, version, n, r, p, keyLength, encodedSalt, encodedDerivedKey] = fields;
  if (
    algorithm !== SCRYPT_PARAMETERS.algorithm ||
    version !== SCRYPT_PARAMETERS.version ||
    n !== String(SCRYPT_PARAMETERS.N) ||
    r !== String(SCRYPT_PARAMETERS.r) ||
    p !== String(SCRYPT_PARAMETERS.p) ||
    keyLength !== String(SCRYPT_PARAMETERS.keyLength)
  ) {
    return null;
  }

  const salt = decodeCanonicalBase64Url(encodedSalt, MIN_SALT_LENGTH, MAX_SALT_LENGTH);
  const derivedKey = decodeCanonicalBase64Url(
    encodedDerivedKey,
    SCRYPT_PARAMETERS.keyLength,
    SCRYPT_PARAMETERS.keyLength
  );

  if (!salt || !derivedKey) {
    return null;
  }

  return { salt, derivedKey };
}

function deriveKey(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      SCRYPT_PARAMETERS.keyLength,
      {
        N: SCRYPT_PARAMETERS.N,
        r: SCRYPT_PARAMETERS.r,
        p: SCRYPT_PARAMETERS.p,
        maxmem: SCRYPT_PARAMETERS.maxmem
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derivedKey);
      }
    );
  });
}

const DUMMY_PASSWORD_HASH = formatPasswordHash(
  Buffer.alloc(SCRYPT_PARAMETERS.saltLength),
  Buffer.alloc(SCRYPT_PARAMETERS.keyLength)
);

function isPasswordHashValid(encodedHash) {
  return parsePasswordHash(encodedHash) !== null;
}

function getPasswordHashMetadata(encodedHash) {
  const parsed = parsePasswordHash(encodedHash);
  if (!parsed) {
    return null;
  }

  return {
    algorithm: SCRYPT_PARAMETERS.algorithm,
    version: SCRYPT_PARAMETERS.version,
    N: SCRYPT_PARAMETERS.N,
    r: SCRYPT_PARAMETERS.r,
    p: SCRYPT_PARAMETERS.p,
    keyLength: SCRYPT_PARAMETERS.keyLength,
    saltLength: parsed.salt.length,
    derivedKeyLength: parsed.derivedKey.length
  };
}

async function createPasswordHash(password) {
  if (
    typeof password !== 'string' ||
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    throw new TypeError('Password length is outside the supported range.');
  }

  const salt = randomBytes(SCRYPT_PARAMETERS.saltLength);
  const derivedKey = await deriveKey(password, salt);
  return formatPasswordHash(salt, derivedKey);
}

async function verifyPassword(password, encodedHash) {
  const passwordIsValid = typeof password === 'string' && password.length <= PASSWORD_MAX_LENGTH;
  const safePassword = passwordIsValid ? password : '';
  const parsedHash = parsePasswordHash(encodedHash);
  const effectiveHash = parsedHash || parsePasswordHash(DUMMY_PASSWORD_HASH);

  if (!effectiveHash) {
    return false;
  }

  try {
    const derivedKey = await deriveKey(safePassword, effectiveHash.salt);
    const matches =
      derivedKey.length === effectiveHash.derivedKey.length &&
      timingSafeEqual(derivedKey, effectiveHash.derivedKey);

    return passwordIsValid && parsedHash !== null && matches;
  } catch {
    return false;
  }
}

module.exports = {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  SCRYPT_PARAMETERS,
  createPasswordHash,
  getPasswordHashMetadata,
  isPasswordHashValid,
  verifyPassword
};
