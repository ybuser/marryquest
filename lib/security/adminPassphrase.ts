import { createHash, timingSafeEqual } from 'node:crypto';
import { isConfiguredServerSecret } from './configValue';

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function verifyAdminPassphrase(
  providedHeader: string | string[] | undefined,
  configuredPassphrase: string | undefined = process.env.ADMIN_PASSPHRASE
): boolean {
  const configuredIsValid = isConfiguredServerSecret(configuredPassphrase);
  const providedIsValid = typeof providedHeader === 'string' && providedHeader.length > 0;
  const configuredDigest = digest(typeof configuredPassphrase === 'string' ? configuredPassphrase : '');
  const providedDigest = digest(typeof providedHeader === 'string' ? providedHeader : '');
  const matches = timingSafeEqual(configuredDigest, providedDigest);

  return configuredIsValid && providedIsValid && matches;
}
