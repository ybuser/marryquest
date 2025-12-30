import { ZodError, type ZodSchema } from 'zod';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export function validate<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const errors = parsed.error.errors.map((issue) => `${issue.path.join('.')} ${issue.message}`.trim());
    return { success: false, errors };
  }
  return { success: true, data: parsed.data };
}

export function assertValid<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    const zodError = error as ZodError;
    const formatted = zodError.errors.map((issue) => `${issue.path.join('.')} ${issue.message}`.trim()).join(', ');
    throw new Error(`Validation failed: ${formatted}`);
  }
}
