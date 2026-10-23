// CSRF protection for the admin JSON API (PRD §9, §12).
// The token is an HMAC of the session token, so it is bound to one login and needs no storage.
// The admin app sends it back in the `X-CSRF-Token` header on every write.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { sessionToken } from './session.js';

export const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function csrfTokenFor(session: string): string {
  return createHmac('sha256', env.SESSION_SECRET).update(`csrf:${session}`).digest('base64url');
}

export function verifyCsrf(session: string | undefined, given: string | undefined): boolean {
  if (!session || !given) return false;
  const expected = Buffer.from(csrfTokenFor(session));
  const actual = Buffer.from(given);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** 403 on a write without a valid CSRF token. Mount after requireAdmin. */
export const requireCsrf: RequestHandler = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (!verifyCsrf(sessionToken(req), req.get(CSRF_HEADER))) {
    res.status(403).json({ error: 'csrf' });
    return;
  }
  next();
};
