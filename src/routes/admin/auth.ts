// Admin auth API: first-admin setup, login (password + authenticator code), logout, current admin (PRD §9.1).
import { timingSafeEqual } from 'node:crypto';
import { Router, type Request } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { Admin } from '../../models/Admin.js';
import { authenticateAdmin, createAdminAccount, MIN_PASSWORD_LENGTH } from '../../auth/login.js';
import { csrfTokenFor, requireCsrf } from '../../auth/csrf.js';
import {
  endAdminSession,
  findAdminIdentity,
  requireAdmin,
  sessionToken,
  startAdminSession,
} from '../../auth/session.js';

export const authRouter = Router();

const loginBody = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(256),
  code: z.string().trim().regex(/^\d{6}$/),
});

const setupBody = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(256),
});

function hasSetupToken(req: Request) {
  if (!env.ADMIN_SETUP_TOKEN) return false;
  const expected = Buffer.from(`Bearer ${env.ADMIN_SETUP_TOKEN}`);
  const given = Buffer.from(req.get('authorization') ?? '');
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// Creates the first admin where admin:create can't run. Without the token the route doesn't exist: the request
// falls through to the session check like any unknown path. The token goes in Authorization, which logs redact.
authRouter.post('/setup', async (req, res, next) => {
  if (!hasSetupToken(req)) {
    next();
    return;
  }
  if (await Admin.exists({})) {
    res.status(409).json({ error: 'admin_exists' });
    return;
  }
  const parsed = setupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_body' });
    return;
  }
  const { id, totpSecret, otpauthUrl } = await createAdminAccount(parsed.data.username, parsed.data.password);
  logger.warn({ adminId: id }, 'first admin created through the setup endpoint');
  res.status(201).set('Cache-Control', 'no-store').json({ otpauthUrl, totpSecret });
});

// The same message for a wrong username, password or code, and for a locked account (§9.1).
const LOGIN_FAILED = { error: 'invalid_credentials' };

authRouter.post('/login', async (req, res) => {
  const parsed = loginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(401).json(LOGIN_FAILED);
    return;
  }
  const result = await authenticateAdmin({ ...parsed.data, ip: req.ip ?? 'unknown' });
  if (!result.ok) {
    res.status(401).json(LOGIN_FAILED);
    return;
  }
  const token = startAdminSession(res, result.adminId);
  const admin = await findAdminIdentity(result.adminId);
  res.json({ admin, csrfToken: csrfTokenFor(token) });
});

authRouter.post('/logout', requireAdmin, requireCsrf, (_req, res) => {
  endAdminSession(res);
  res.status(204).end();
});

authRouter.get('/me', requireAdmin, (req, res) => {
  res.json({ admin: req.admin, csrfToken: csrfTokenFor(sessionToken(req)!) });
});
