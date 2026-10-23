// Admin session: signed cookie as in trust-me src/server/auth/session.ts + admin.ts, adapted to Express (PRD §9.1).
// Token: `base64url(json).base64url(HMAC-SHA256)` with `{ aid, exp }`; `exp` is unix seconds.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, RequestHandler, Response } from 'express';
import mongoose, { type Types } from 'mongoose';
import { env } from '../config/env.js';
import { Admin } from '../models/Admin.js';
import { readCookie } from '../lib/cookies.js';

export const ADMIN_COOKIE = 'ps_admin';
export const SESSION_TTL_SECONDS = 12 * 60 * 60;

export type AdminIdentity = {
  id: Types.ObjectId;
  username: string;
  role: 'owner' | 'moderator';
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminIdentity;
    }
  }
}

const mac = (data: string, secret: string) => {
  if (secret.length < 32) throw new Error('weak_session_secret');
  return createHmac('sha256', secret).update(data).digest('base64url');
};

export function signSession(p: { aid: string; exp: number }, secret: string): string {
  const body = Buffer.from(JSON.stringify({ aid: p.aid, exp: p.exp })).toString('base64url');
  return `${body}.${mac(body, secret)}`;
}

export function verifySession(token: string, secret: string, nowSeconds: number): { aid: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts as [string, string];
  const expected = Buffer.from(mac(body, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { aid?: unknown; exp?: unknown };
    if (typeof p.aid !== 'string' || typeof p.exp !== 'number') return null;
    if (p.exp <= nowSeconds) return null;
    return { aid: p.aid };
  } catch {
    return null;
  }
}

export const adminCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/admin',
  maxAge: SESSION_TTL_SECONDS * 1000,
});

export function sessionToken(req: Request): string | undefined {
  return readCookie(req, ADMIN_COOKIE);
}

/** Starts a session and returns its token (the CSRF token is derived from it). */
export function startAdminSession(res: Response, adminId: Types.ObjectId): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = signSession({ aid: String(adminId), exp }, env.SESSION_SECRET);
  res.cookie(ADMIN_COOKIE, token, adminCookieOptions());
  return token;
}

export function endAdminSession(res: Response) {
  const { maxAge: _maxAge, ...opts } = adminCookieOptions();
  res.clearCookie(ADMIN_COOKIE, opts);
}

/**
 * The signed-in admin, or null for a missing, malformed, tampered, expired or orphaned
 * session. Never throws for a bad cookie; database errors propagate.
 */
export async function getAdmin(req: Request): Promise<AdminIdentity | null> {
  const token = sessionToken(req);
  if (!token) return null;
  const session = verifySession(token, env.SESSION_SECRET, Math.floor(Date.now() / 1000));
  if (!session || !mongoose.isValidObjectId(session.aid)) return null;
  return findAdminIdentity(session.aid);
}

export async function findAdminIdentity(id: string | Types.ObjectId): Promise<AdminIdentity | null> {
  const doc = await Admin.findById(id, { username: 1, role: 1 }).lean();
  if (!doc) return null;
  return { id: doc._id, username: doc.username, role: doc.role ?? 'owner' };
}

/** 401 unless a valid admin session is present; sets req.admin. */
export const requireAdmin: RequestHandler = async (req, res, next) => {
  const admin = await getAdmin(req);
  if (!admin) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  req.admin = admin;
  next();
};
