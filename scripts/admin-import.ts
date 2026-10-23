// npm run admin:import -- <username>: copies an admin from trust-me's database (PRD §9.1).
// Reads trust-me's `adminaccounts` (TRUSTME_MONGODB_URI, read only) and copies username, passwordHash,
// totpSecretEnc and role as is. Works because both apps share DATA_ENCRYPTION_KEY and the same formats.
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { importAdmin } from '../src/auth/importAdmin.js';

const username = process.argv[2]?.trim().toLowerCase();
if (!username) {
  console.error('Usage: npm run admin:import -- <username>');
  process.exit(1);
}
if (!env.TRUSTME_MONGODB_URI) {
  console.error('Set TRUSTME_MONGODB_URI (read-only access to trust-me) in backend/.env.');
  process.exit(1);
}

const trustme = await mongoose.createConnection(env.TRUSTME_MONGODB_URI, { readPreference: 'secondaryPreferred' }).asPromise();
await connectDb();
try {
  const result = await importAdmin(trustme, username);
  if (result === 'not_found') {
    console.error(`No admin "${username}" in trust-me.`);
    process.exitCode = 1;
  } else {
    console.log(`Admin "${username}" ${result}. Log in with your trust-me password and the same authenticator code.`);
  }
} finally {
  await trustme.close();
  await disconnectDb();
}
