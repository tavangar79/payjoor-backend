// Express error handler: zod errors become 400, everything else 500 without internals (PRD §12).
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger.js';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'invalid_input', issues: err.issues });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  // Body-parser errors (too large, bad JSON) carry their own 4xx status.
  const status = typeof err?.status === 'number' && err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) logger.error({ err }, 'unhandled error');
  res.status(status).json({ error: status === 500 ? 'internal_error' : 'bad_request' });
};
