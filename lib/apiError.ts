import type { NextApiResponse } from 'next';

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'METHOD_NOT_ALLOWED'
  | 'INTERNAL_ERROR';

export function apiError(res: NextApiResponse, status: number, error: ApiErrorCode | string, message?: string) {
  return res.status(status).json(message ? { error, message } : { error });
}

export function methodNotAllowed(res: NextApiResponse, allowed: string) {
  res.setHeader('Allow', allowed);
  return apiError(res, 405, 'METHOD_NOT_ALLOWED');
}

export function toYmd(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}
