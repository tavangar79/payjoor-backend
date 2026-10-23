// Admin auth API: login (password + authenticator code), logout, current admin (PRD §9.1).
import { Router } from 'express';
import { z } from 'zod';
import { authenticateAdmin } from '../../auth/login.js';
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
