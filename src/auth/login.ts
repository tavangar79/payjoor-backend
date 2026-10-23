// Admin login with lockout, copied from trust-me src/server/auth/login.ts (PRD §9.1).
// Changes from trust-me: no audit log collection (pino logs instead) and the bot's Admin model.
import type { Types } from 'mongoose';
import { Admin, TOTP_AAD } from '../models/Admin.js';
import { LoginAttempt } from '../models/LoginAttempt.js';
import { decryptField, encryptField } from '../lib/encryptField.js';
import { logger } from '../lib/logger.js';
import { hashPassword, verifyPassword } from './password.js';
import { generateTotpSecret, otpauthUrl, verifyTotp } from './totp.js';

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60_000;
const LOCK_MS = 15 * 60_000;
export const MIN_PASSWORD_LENGTH = 12;

// Fixed dummy hash (scrypt N=16384 r=8 p=1) so unknown usernames cost the same as known ones.
const DUMMY_HASH = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + Buffer.alloc(64, 1).toString('base64');

export async function createAdminAccount(
  username: string,
  password: string,
): Promise<{ id: Types.ObjectId; totpSecret: string; otpauthUrl: string }> {
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error('weak_password');
  const name = username.trim().toLowerCase();
  const totpSecret = generateTotpSecret();
  const doc = await Admin.create({
    username: name,
    passwordHash: await hashPassword(password),
    totpSecretEnc: encryptField(totpSecret, undefined, TOTP_AAD),
  });
  return { id: doc._id, totpSecret, otpauthUrl: otpauthUrl(totpSecret, name) };
}

export type AuthResult = { ok: true; adminId: Types.ObjectId } | { ok: false; reason: 'invalid' | 'locked' };

/**
 * Atomically reserves one attempt for `key` BEFORE credentials are verified, so parallel
 * requests cannot all pass a stale lock check. A stale window or expired lock is reset;
 * the 5th reservation sets lockedUntil; reservations while locked are refused.
 */
async function reserveAttempt(key: string, now: Date): Promise<boolean> {
  const epoch = new Date(0);
  const cutoff = new Date(now.getTime() - WINDOW_MS);
  const lockEnd = new Date(now.getTime() + LOCK_MS);
  const row = await LoginAttempt.findOneAndUpdate(
    { key },
    [
      {
        $set: {
          _locked: { $gt: [{ $ifNull: ['$lockedUntil', epoch] }, now] },
          _reset: {
            $or: [
              { $lt: [{ $ifNull: ['$windowStart', epoch] }, cutoff] },
              { $and: [{ $gt: ['$lockedUntil', null] }, { $lte: ['$lockedUntil', now] }] },
            ],
          },
        },
      },
      {
        $set: {
          failures: {
            $cond: ['$_locked', '$failures', { $cond: ['$_reset', 1, { $add: [{ $ifNull: ['$failures', 0] }, 1] }] }],
          },
          windowStart: { $cond: [{ $and: [{ $not: ['$_locked'] }, '$_reset'] }, now, '$windowStart'] },
        },
      },
      {
        $set: {
          lockedUntil: {
            $cond: ['$_locked', '$lockedUntil', { $cond: [{ $gte: ['$failures', MAX_FAILURES] }, lockEnd, '$$REMOVE'] }],
          },
        },
      },
    ],
    { upsert: true, returnDocument: 'after', strict: false },
  ).lean();
  return !(row as unknown as { _locked: boolean })._locked;
}

export async function authenticateAdmin(
  a: { username: string; password: string; code: string; ip: string },
  now: Date = new Date(),
): Promise<AuthResult> {
  const username = a.username.trim().toLowerCase();
  const key = `${a.ip}|${username}`;

  const account = await Admin.findOne({ username });
  let secret: string | null = null;
  if (account) {
    try {
      secret = decryptField(account.totpSecretEnc, undefined, TOTP_AAD);
    } catch {
      // Server misconfiguration or tampering, not a credential failure: do not count it.
      logger.error({ username }, 'totp secret decrypt failed');
      return { ok: false, reason: 'invalid' };
    }
  }

  if (!(await reserveAttempt(key, now))) return { ok: false, reason: 'locked' };

  const passwordOk = await verifyPassword(a.password, account?.passwordHash ?? DUMMY_HASH);
  const step = secret !== null ? verifyTotp(secret, a.code, Math.floor(now.getTime() / 1000)) : null;

  let success = false;
  if (account && passwordOk && step !== null) {
    // Atomic replay guard: only advance if this step is newer than the last accepted one.
    const updated = await Admin.findOneAndUpdate(
      { _id: account._id, $or: [{ lastTotpStep: { $exists: false } }, { lastTotpStep: { $lt: step } }] },
      { $set: { lastTotpStep: step, lastLoginAt: now } },
    );
    success = updated !== null;
  }

  if (success && account) {
    await LoginAttempt.deleteOne({ key });
    logger.info({ adminId: String(account._id) }, 'admin login');
    return { ok: true, adminId: account._id };
  }

  if (account) logger.warn({ adminId: String(account._id) }, 'admin login failed');
  return { ok: false, reason: 'invalid' };
}
