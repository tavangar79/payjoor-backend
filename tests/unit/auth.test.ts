import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import type { Request } from 'express';
import { hashPassword, verifyPassword } from '../../src/auth/password.js';
import { base32Decode, base32Encode, generateTotpSecret, otpauthUrl, totpCode, verifyTotp } from '../../src/auth/totp.js';
import { signSession, verifySession } from '../../src/auth/session.js';
import { csrfTokenFor, verifyCsrf } from '../../src/auth/csrf.js';
import { readCookie } from '../../src/lib/cookies.js';

describe('password', () => {
  it('hashes in pagesanj format and verifies', async () => {
    const h = await hashPassword('a-long-enough-password');
    expect(h).toMatch(/^scrypt\$16384\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    expect(await verifyPassword('a-long-enough-password', h)).toBe(true);
    expect(await verifyPassword('wrong', h)).toBe(false);
  });

  it('returns false for malformed or foreign-parameter hashes', async () => {
    expect(await verifyPassword('x', 'garbage')).toBe(false);
    expect(await verifyPassword('x', 'scrypt$1024$8$1$AAAA$AAAA')).toBe(false);
    expect(await verifyPassword('x', 'bcrypt$a$b$c$d$e')).toBe(false);
  });
});

describe('totp (pagesanj vectors)', () => {
  const S = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

  it('matches RFC 6238 SHA-1 vectors', () => {
    expect(base32Encode(Buffer.from('12345678901234567890'))).toBe(S);
    expect(totpCode(S, 59)).toBe('287082');
    expect(totpCode(S, 1111111109)).toBe('081804');
    expect(totpCode(S, 1234567890)).toBe('005924');
  });

  it('accepts +/-1 step, returns the step, rejects malformed codes', () => {
    expect(verifyTotp(S, '287082', 59 + 30)).toBe(1);
    expect(verifyTotp(S, '287082', 59 + 90)).toBeNull();
    expect(verifyTotp(S, '12345', 59)).toBeNull();
    expect(verifyTotp(S, 'abcdef', 59)).toBeNull();
  });

  it('round-trips base32 and builds a Pagesanj otpauth url', () => {
    for (let n = 1; n < 40; n++) {
      const b = randomBytes(n);
      expect(base32Decode(base32Encode(b)).equals(b)).toBe(true);
    }
    const s = generateTotpSecret();
    expect(base32Decode(s).length).toBe(20);
    expect(otpauthUrl(s, 'founder')).toBe(`otpauth://totp/Pagesanj:founder?secret=${s}&issuer=Pagesanj`);
  });
});

describe('session token', () => {
  const secret = 'k'.repeat(32);

  it('verifies a fresh token and rejects expired or tampered ones', () => {
    const t = signSession({ aid: 'abc', exp: 1000 }, secret);
    expect(verifySession(t, secret, 999)).toEqual({ aid: 'abc' });
    expect(verifySession(t, secret, 1000)).toBeNull();
    expect(verifySession(t, 'x'.repeat(32), 999)).toBeNull();
    const [body, sig] = t.split('.') as [string, string];
    const forged = Buffer.from(JSON.stringify({ aid: 'other', exp: 1000 })).toString('base64url');
    expect(verifySession(`${forged}.${sig}`, secret, 999)).toBeNull();
    expect(verifySession(body, secret, 999)).toBeNull();
  });

  it('refuses a weak secret', () => {
    expect(() => signSession({ aid: 'a', exp: 1 }, 'short')).toThrow('weak_session_secret');
  });
});

describe('csrf', () => {
  it('binds the token to the session', () => {
    const t = csrfTokenFor('session-a');
    expect(verifyCsrf('session-a', t)).toBe(true);
    expect(verifyCsrf('session-b', t)).toBe(false);
    expect(verifyCsrf('session-a', undefined)).toBe(false);
    expect(verifyCsrf(undefined, t)).toBe(false);
    expect(verifyCsrf('session-a', t.slice(1))).toBe(false);
  });
});

describe('readCookie', () => {
  const req = (cookie?: string) => ({ headers: { cookie } }) as Request;

  it('reads one cookie by exact name', () => {
    expect(readCookie(req('a=1; ps_admin=tok.sig; b=2'), 'ps_admin')).toBe('tok.sig');
    expect(readCookie(req('xps_admin=1'), 'ps_admin')).toBeUndefined();
    expect(readCookie(req(), 'ps_admin')).toBeUndefined();
    expect(readCookie(req('ps_admin=%E0%A4%A'), 'ps_admin')).toBeUndefined();
  });
});
