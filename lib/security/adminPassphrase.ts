import { createHash, timingSafeEqual } from 'node:crypto';
import { isPublicConfigurationPlaceholder } from './configValue';

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function verifyAdminPassphrase(
  providedHeader: string | string[] | undefined,
  configuredPassphrase: string | undefined = process.env.ADMIN_PASSPHRASE
): boolean {
  const configuredIsValid =
    typeof configuredPassphrase === 'string' &&
    configuredPassphrase.length > 0 &&
    !isPublicConfigurationPlaceholder(configuredPassphrase);
  const providedIsValid = typeof providedHeader === 'string' && providedHeader.length > 0;
  const configuredDigest = digest(configuredIsValid ? configuredPassphrase : '');
  const providedDigest = digest(providedIsValid ? providedHeader : '');
  const matches = timingSafeEqual(configuredDigest, providedDigest);

  return configuredIsValid && providedIsValid && matches;
}
