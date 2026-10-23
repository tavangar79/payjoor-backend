// Parse and verify Meta's `signed_request` (PRD §7.3): `<base64url HMAC-SHA256 signature>.<base64url JSON>`,
// signed with META_APP_SECRET. Timing-safe compare; null on any problem.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

export type SignedRequest = { user_id: string; algorithm: string; issued_at?: number; [key: string]: unknown };

export function signRequest(payload: object, secret: string = env.META_APP_SECRET): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${sig}.${body}`;
}

export function parseSignedRequest(input: unknown, secret: string = env.META_APP_SECRET): SignedRequest | null {
  if (typeof input !== 'string' || input.length > 4_096) return null;
  const parts = input.split('.');
  if (parts.length !== 2) return null;
  const [sigPart, body] = parts as [string, string];
  const given = Buffer.from(sigPart, 'base64url');
  const expected = createHmac('sha256', secret).update(body).digest();
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Partial<SignedRequest>;
    if (String(payload.algorithm).toUpperCase() !== 'HMAC-SHA256') return null;
    const userId = payload.user_id;
    if (typeof userId !== 'string' && typeof userId !== 'number') return null;
    return { ...payload, user_id: String(userId), algorithm: 'HMAC-SHA256' };
  } catch {
    return null;
  }
}
