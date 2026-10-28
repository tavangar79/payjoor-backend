// Copies one admin from pagesanj's database into ours (PRD §9.1), used by scripts/admin-import.ts.
// Only reads from pagesanj. The decrypt check fails fast if the two apps don't share DATA_ENCRYPTION_KEY.
import type { Connection } from 'mongoose';
import { z } from 'zod';
import { Admin, TOTP_AAD } from '../models/Admin.js';
import { decryptField } from '../lib/encryptField.js';

const pagesanjAdmin = z.object({
  username: z.string(),
  passwordHash: z.string().startsWith('scrypt$'),
  totpSecretEnc: z.string().startsWith('v1:'),
  role: z.enum(['owner', 'moderator']).default('owner'),
});

export async function importAdmin(pagesanj: Connection, username: string): Promise<'created' | 'updated' | 'not_found'> {
  const raw = await pagesanj.collection('adminaccounts').findOne({ username: username.trim().toLowerCase() });
  if (!raw) return 'not_found';
  const src = pagesanjAdmin.parse(raw);

  try {
    decryptField(src.totpSecretEnc, undefined, TOTP_AAD);
  } catch {
    throw new Error('Cannot decrypt the TOTP secret: DATA_ENCRYPTION_KEY must be the same as pagesanj\'s.');
  }

  const existing = await Admin.exists({ username: src.username });
  await Admin.updateOne(
    { username: src.username },
    { $set: { passwordHash: src.passwordHash, totpSecretEnc: src.totpSecretEnc, role: src.role } },
    { upsert: true },
  );
  return existing ? 'updated' : 'created';
}
