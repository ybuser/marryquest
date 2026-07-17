const PUBLIC_PLACEHOLDER_PREFIX = 'replace-with-';
const UNICODE_WHITESPACE_PATTERN = /[\s\p{White_Space}]/u;

export function isPublicConfigurationPlaceholder(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    value.trim().toLowerCase().startsWith(PUBLIC_PLACEHOLDER_PREFIX)
  );
}

export function isConfiguredServerSecret(value: unknown, minimumLength: number = 32): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length >= minimumLength &&
    value === value.trim() &&
    !UNICODE_WHITESPACE_PATTERN.test(value) &&
    !isPublicConfigurationPlaceholder(value)
  );
}
