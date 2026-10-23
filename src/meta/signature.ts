// Verify X-Hub-Signature-256 (`sha256=<hex HMAC of the raw body>`) with META_APP_SECRET (PRD §5.1, §12).
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

export const SIGNATURE_HEADER = 'x-hub-signature-256';

export function signBody(rawBody: Buffer, secret: string = env.META_APP_SECRET): string {
  return `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
}

export function verifySignature(
  rawBody: Buffer,
  header: string | undefined,
  secret: string = env.META_APP_SECRET,
): boolean {
  if (!header || !/^sha256=[0-9a-f]{64}$/i.test(header)) return false;
  const expected = Buffer.from(signBody(rawBody, secret));
  const given = Buffer.from(header.toLowerCase());
  return expected.length === given.length && timingSafeEqual(expected, given);
}
