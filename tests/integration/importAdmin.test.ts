import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { useMongo } from '../setup/mongo.js';
import { importAdmin } from '../../src/auth/importAdmin.js';
import { Admin, TOTP_AAD } from '../../src/models/Admin.js';
import { hashPassword } from '../../src/auth/password.js';
import { encryptField } from '../../src/lib/encryptField.js';
import { authenticateAdmin } from '../../src/auth/login.js';
import { totpCode } from '../../src/auth/totp.js';

useMongo();

const SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
const PW = 'pagesanj-password';

// Stands in for pagesanj's database: same server, another db name.
const pagesanj = () => mongoose.connection.useDb('pagesanj-test');

async function seedPagesanj(over: Record<string, unknown> = {}) {
  await pagesanj().collection('adminaccounts').deleteMany({});
  await pagesanj()
    .collection('adminaccounts')
    .insertOne({
      username: 'founder',
      passwordHash: await hashPassword(PW),
      totpSecretEnc: encryptField(SECRET, undefined, TOTP_AAD),
      role: 'owner',
      lastTotpStep: 123,
      ...over,
    });
}

describe('importAdmin', () => {
  it('copies the record so the same password and authenticator code work', async () => {
    await seedPagesanj();
    expect(await importAdmin(pagesanj(), 'Founder')).toBe('created');
    const doc = (await Admin.findOne({ username: 'founder' }).lean())!;
    expect(doc.lastTotpStep).toBeUndefined();
    const t = new Date();
    const r = await authenticateAdmin({
      username: 'founder',
      password: PW,
      code: totpCode(SECRET, Math.floor(t.getTime() / 1000)),
      ip: '1.1.1.1',
    });
    expect(r.ok).toBe(true);
  });

  it('updates an existing admin and reports a missing one', async () => {
    await seedPagesanj({ role: 'moderator' });
    await importAdmin(pagesanj(), 'founder');
    expect(await importAdmin(pagesanj(), 'founder')).toBe('updated');
    expect((await Admin.findOne({ username: 'founder' }).lean())!.role).toBe('moderator');
    expect(await importAdmin(pagesanj(), 'ghost')).toBe('not_found');
  });

  it('refuses a secret encrypted with another key', async () => {
    await seedPagesanj({ totpSecretEnc: encryptField(SECRET, Buffer.alloc(32, 9), TOTP_AAD) });
    await expect(importAdmin(pagesanj(), 'founder')).rejects.toThrow(/DATA_ENCRYPTION_KEY/);
    expect(await Admin.countDocuments({})).toBe(0);
  });
});
