// Admin password hashing, copied from pagesanj src/server/auth/password.ts (PRD §8 admins, §9.1).
// Keep the format byte-compatible so imported pagesanj hashes verify: `scrypt$N$r$p$<salt b64>$<hash b64>`.
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const SALT_BYTES = 16;

function derive(pw: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(pw.normalize('NFKC'), salt, KEYLEN, { N: n, r, p }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(pw, salt, N, R, P);
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

/** Constant-time compare; false (never throws) on malformed input. */
export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
    const [n, r, p] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
    if (n !== N || r !== R || p !== P) return false;
    const salt = Buffer.from(parts[4]!, 'base64');
    const expected = Buffer.from(parts[5]!, 'base64');
    if (salt.length === 0 || expected.length !== KEYLEN) return false;
    const actual = await derive(pw, salt, n, r, p);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
