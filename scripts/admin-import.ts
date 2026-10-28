// npm run admin:import -- <username>: copies an admin from pagesanj's database (PRD §9.1).
// Reads pagesanj's `adminaccounts` (PAGESANJ_MONGODB_URI, read only) and copies username, passwordHash,
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
if (!env.PAGESANJ_MONGODB_URI) {
  console.error('Set PAGESANJ_MONGODB_URI (read-only access to pagesanj) in backend/.env.');
  process.exit(1);
}

const pagesanj = await mongoose.createConnection(env.PAGESANJ_MONGODB_URI, { readPreference: 'secondaryPreferred' }).asPromise();
await connectDb();
try {
  const result = await importAdmin(pagesanj, username);
  if (result === 'not_found') {
    console.error(`No admin "${username}" in pagesanj.`);
    process.exitCode = 1;
  } else {
    console.log(`Admin "${username}" ${result}. Log in with your pagesanj password and the same authenticator code.`);
  }
} finally {
  await pagesanj.close();
  await disconnectDb();
}
