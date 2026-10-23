// npm run admin:create -- <username>: password from ADMIN_PASSWORD, prints otpauth URL once, issuer TrustMe (PRD §9.1).
// For a bot-only admin. To reuse a trust-me admin (same authenticator entry), use admin:import instead.
import { env } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { createAdminAccount, MIN_PASSWORD_LENGTH } from '../src/auth/login.js';

const username = process.argv[2];
if (!username) {
  console.error('Usage: npm run admin:create -- <username>   (password in ADMIN_PASSWORD)');
  process.exit(1);
}
if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < MIN_PASSWORD_LENGTH) {
  console.error(`Set ADMIN_PASSWORD (at least ${MIN_PASSWORD_LENGTH} characters) in backend/.env or the environment.`);
  process.exit(1);
}

await connectDb();
try {
  const { totpSecret, otpauthUrl } = await createAdminAccount(username, env.ADMIN_PASSWORD);
  console.log(`Admin "${username.trim().toLowerCase()}" created.`);
  console.log('Add it to your authenticator app now; this is shown only once.');
  console.log(`  otpauth URL: ${otpauthUrl}`);
  console.log(`  secret:      ${totpSecret}`);
  console.log('Then remove ADMIN_PASSWORD from the environment.');
} catch (err) {
  const dup = (err as { code?: number }).code === 11000;
  console.error(dup ? `Admin "${username}" already exists.` : (err as Error).message);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}
