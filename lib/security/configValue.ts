const PUBLIC_PLACEHOLDER_PREFIX = 'replace-with-';

export function isPublicConfigurationPlaceholder(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    value.trim().toLowerCase().startsWith(PUBLIC_PLACEHOLDER_PREFIX)
  );
}

export function isConfiguredServerSecret(value: unknown, minimumLength: number = 32): value is string {
  return (
    typeof value === 'string' &&
    value.length >= minimumLength &&
    !isPublicConfigurationPlaceholder(value)
  );
}
