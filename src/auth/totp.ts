// TOTP (RFC 6238, SHA-1, 6 digits, 30 s), copied from pagesanj src/server/auth/totp.ts (PRD §9.1).
// Same secrets as pagesanj, so the admin's existing "Pagesanj" authenticator entry works here too.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PERIOD = 30;

/** RFC 4648 base32, no padding. */
export function base32Encode(b: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of b) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** Case-insensitive; ignores padding and spaces; throws on invalid characters. */
export function base32Decode(s: string): Buffer {
  const clean = s.replace(/[\s=]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error('Invalid base32 character');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function hotp(key: Buffer, counter: number, digits: number): string {
  const msg = Buffer.alloc(8);
  msg.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  msg.writeUInt32BE(counter >>> 0, 4);
  const h = createHmac('sha1', key).update(msg).digest();
  const off = h[h.length - 1]! & 0x0f;
  const bin = ((h[off]! & 0x7f) << 24) | (h[off + 1]! << 16) | (h[off + 2]! << 8) | h[off + 3]!;
  return String(bin % 10 ** digits).padStart(digits, '0');
}

export function totpCode(secret: string, unixSeconds: number, digits = 6): string {
  return hotp(base32Decode(secret), Math.floor(unixSeconds / PERIOD), digits);
}

/** Accepts steps t-1..t+1, compared in constant time; returns the matched step number or null. */
export function verifyTotp(secret: string, code: string, unixSeconds: number): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const key = base32Decode(secret);
  const t = Math.floor(unixSeconds / PERIOD);
  const given = Buffer.from(code);
  let matched: number | null = null;
  for (const step of [t - 1, t, t + 1]) {
    if (step < 0) continue;
    const expected = Buffer.from(hotp(key, step, 6));
    if (timingSafeEqual(expected, given) && matched === null) matched = step;
  }
  return matched;
}

export function otpauthUrl(secret: string, account: string, issuer = 'Pagesanj'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}
