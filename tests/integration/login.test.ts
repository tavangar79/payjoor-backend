// Ported from pagesanj src/server/auth/login.test.ts (audit-log assertions dropped).
import { describe, expect, it } from 'vitest';
import { useMongo } from '../setup/mongo.js';
import { Admin, TOTP_AAD } from '../../src/models/Admin.js';
import { LoginAttempt } from '../../src/models/LoginAttempt.js';
import { authenticateAdmin, createAdminAccount } from '../../src/auth/login.js';
import { totpCode } from '../../src/auth/totp.js';
import { decryptField } from '../../src/lib/encryptField.js';

useMongo();

const PW = 'a-long-enough-password';
const T0 = new Date('2026-01-01T12:00:00Z');
const code = (secret: string, d: Date) => totpCode(secret, Math.floor(d.getTime() / 1000));
const plus = (d: Date, ms: number) => new Date(d.getTime() + ms);

describe('admin login', () => {
  it('rejects weak passwords', async () => {
    await expect(createAdminAccount('founder', '12345678')).rejects.toThrow('weak_password');
  });

  it('stores a lowercase username and a secret encrypted with the admin:totp AAD', async () => {
    const { id, totpSecret, otpauthUrl } = await createAdminAccount('Founder', PW);
    const doc = (await Admin.findById(id).lean())!;
    expect(doc.username).toBe('founder');
    expect(doc.totpSecretEnc).not.toContain(totpSecret);
    expect(decryptField(doc.totpSecretEnc, undefined, TOTP_AAD)).toBe(totpSecret);
    expect(() => decryptField(doc.totpSecretEnc, undefined, 'meta:token')).toThrow();
    expect(otpauthUrl).toContain(totpSecret);
  });

  it('logs in with correct credentials and records the step', async () => {
    const { id, totpSecret } = await createAdminAccount('founder', PW);
    const r = await authenticateAdmin({ username: 'FOUNDER', password: PW, code: code(totpSecret, T0), ip: '1.1.1.1' }, T0);
    expect(r).toEqual({ ok: true, adminId: id });
    const doc = (await Admin.findById(id).lean())!;
    expect(doc.lastLoginAt).toEqual(T0);
    expect(doc.lastTotpStep).toBe(Math.floor(T0.getTime() / 1000 / 30));
  });

  it('rejects a wrong code without updating lastTotpStep', async () => {
    const { id, totpSecret } = await createAdminAccount('founder', PW);
    const bad = code(totpSecret, T0) === '000000' ? '000001' : '000000';
    expect(await authenticateAdmin({ username: 'founder', password: PW, code: bad, ip: '1.1.1.1' }, T0)).toEqual({
      ok: false,
      reason: 'invalid',
    });
    const doc = (await Admin.findById(id).lean())!;
    expect(doc.lastTotpStep).toBeUndefined();
    expect(doc.lastLoginAt).toBeUndefined();
  });

  it('rejects a replayed code but accepts a later step', async () => {
    const { totpSecret } = await createAdminAccount('founder', PW);
    const a = { username: 'founder', password: PW, code: code(totpSecret, T0), ip: '1.1.1.1' };
    expect((await authenticateAdmin(a, T0)).ok).toBe(true);
    expect(await authenticateAdmin(a, plus(T0, 1000))).toEqual({ ok: false, reason: 'invalid' });
    const next = plus(T0, 30_000);
    expect((await authenticateAdmin({ ...a, code: code(totpSecret, next) }, next)).ok).toBe(true);
  });

  it('locks after 5 failures for 15 minutes, then recovers', async () => {
    const { totpSecret } = await createAdminAccount('founder', PW);
    for (let i = 0; i < 5; i++) {
      const r = await authenticateAdmin(
        { username: 'founder', password: 'wrong-password-xx', code: '000000', ip: '2.2.2.2' },
        plus(T0, i * 1000),
      );
      expect(r).toEqual({ ok: false, reason: 'invalid' });
    }
    const good = { username: 'founder', password: PW, code: code(totpSecret, T0), ip: '2.2.2.2' };
    expect(await authenticateAdmin(good, plus(T0, 10_000))).toEqual({ ok: false, reason: 'locked' });
    const later = plus(T0, 15 * 60_000 + 5000);
    expect((await authenticateAdmin({ ...good, code: code(totpSecret, later) }, later)).ok).toBe(true);
  });

  it('success resets the failure counter', async () => {
    const { totpSecret } = await createAdminAccount('founder', PW);
    const fail = (ms: number) =>
      authenticateAdmin({ username: 'founder', password: 'nope-nope-nope', code: '000000', ip: '3.3.3.3' }, plus(T0, ms));
    for (let i = 0; i < 4; i++) await fail(i);
    const t = plus(T0, 5000);
    expect((await authenticateAdmin({ username: 'founder', password: PW, code: code(totpSecret, t), ip: '3.3.3.3' }, t)).ok).toBe(true);
    for (let i = 0; i < 4; i++) await fail(10_000 + i);
    const t2 = plus(T0, 60_000);
    expect((await authenticateAdmin({ username: 'founder', password: PW, code: code(totpSecret, t2), ip: '3.3.3.3' }, t2)).ok).toBe(true);
  });

  it('failures for an unknown username count toward its lock', async () => {
    const ghost = { username: 'ghost', password: PW, code: '123456', ip: '6.6.6.6' };
    for (let i = 0; i < 5; i++) {
      expect(await authenticateAdmin(ghost, plus(T0, i * 1000))).toEqual({ ok: false, reason: 'invalid' });
    }
    expect(await authenticateAdmin(ghost, plus(T0, 6000))).toEqual({ ok: false, reason: 'locked' });
    expect((await LoginAttempt.findOne({ key: '6.6.6.6|ghost' }).lean())!.failures).toBe(5);
  });

  it('parallel wrong-password attempts: at most 5 get past the throttle', async () => {
    await createAdminAccount('founder', PW);
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        authenticateAdmin({ username: 'founder', password: 'wrong-password-xx', code: '000000', ip: '4.4.4.4' }, T0),
      ),
    );
    expect(results.filter((r) => !r.ok && r.reason === 'locked').length).toBeGreaterThanOrEqual(5);
    expect(results.filter((r) => !r.ok && r.reason === 'invalid').length).toBeLessThanOrEqual(5);
  });

  it('a corrupt totpSecretEnc is not counted as a failure', async () => {
    const { id } = await createAdminAccount('founder', PW);
    await Admin.updateOne({ _id: id }, { $set: { totpSecretEnc: 'v1:bad:bad:bad' } });
    expect(await authenticateAdmin({ username: 'founder', password: PW, code: '123456', ip: '5.5.5.5' }, T0)).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(await LoginAttempt.countDocuments({})).toBe(0);
  });
});
