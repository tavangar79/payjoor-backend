// Verify BoxAPI webhook signatures (PRD §5.1, §12): X-BoxApi-Signature = `sha256=<hex HMAC of "{timestamp}.{raw body}">`.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const BOXAPI_SIGNATURE_HEADER = 'x-boxapi-signature';
export const BOXAPI_TIMESTAMP_HEADER = 'x-boxapi-timestamp';
// BoxAPI's replay window: reject timestamps more than 5 minutes from our clock.
const MAX_SKEW_SECONDS = 300;

export function signBoxApiBody(rawBody: Buffer, timestamp: string, secret: string): string {
  const hmac = createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody);
  return `sha256=${hmac.digest('hex')}`;
}

export function verifyBoxApiSignature(
  rawBody: Buffer,
  signature: string | undefined,
  timestamp: string | undefined,
  secret: string,
  nowMs: number = Date.now(),
): boolean {
  if (!secret || !signature || !timestamp) return false;
  if (!/^\d+$/.test(timestamp) || Math.abs(nowMs / 1000 - Number(timestamp)) > MAX_SKEW_SECONDS) return false;
  if (!/^sha256=[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(signBoxApiBody(rawBody, timestamp, secret));
  const given = Buffer.from(signature.toLowerCase());
  return expected.length === given.length && timingSafeEqual(expected, given);
}
