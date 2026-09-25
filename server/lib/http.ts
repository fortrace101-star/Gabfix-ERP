import type { Response } from 'express';

/** Throw when any listed field is missing or blank. */
export function required(body: Record<string, unknown>, fields: string[]) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
  if (missing.length) throw new Error(`Missing required fields: ${missing.join(', ')}`);
}

/** PostgreSQL unique-constraint violation. */
export const isUniqueViolation = (error: unknown) => (error as { code?: string })?.code === '23505';

/** Uniform 400 response for a failed write (unique violations get a friendlier message). */
export function fail(res: Response, error: unknown, fallback: string) {
  if (isUniqueViolation(error)) return res.status(400).json({ error: 'A record with that number already exists' });
  return res.status(400).json({ error: error instanceof Error ? error.message : fallback });
}
