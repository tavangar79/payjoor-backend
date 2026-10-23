// npm run spike:apify-profile -- <handle>: one real profile-scraper run (plan task 5.3, PRD §5.6, §15.4).
// Saves the raw dataset to tests/fixtures/apify/profile.json and prints the run cost, so the field names
// in src/apify/profile.ts can be checked. Costs one paid profile result on the Apify account.
import { writeFile } from 'node:fs/promises';
import { env } from '../src/config/env.js';
import { runActor } from '../src/apify/client.js';
import { mapProfile } from '../src/apify/profile.js';
import { normalizeHandle } from '../src/lib/handle.js';

const handle = normalizeHandle(process.argv[2] ?? '');
if (!handle) {
  console.error('Usage: npm run spike:apify-profile -- <instagram handle>');
  process.exit(1);
}

const { run, items } = await runActor(env.APIFY_PROFILE_ACTOR, { usernames: [handle] }, {
  onStart: (r) => console.log(`run ${r.id} started`),
});
const out = new URL('../tests/fixtures/apify/profile.json', import.meta.url);
await writeFile(out, `${JSON.stringify(items, null, 2)}\n`);
console.log(`run ${run.status}, cost $${run.usageTotalUsd ?? '?'}, ${items.length} item(s) -> ${out.pathname}`);
console.log('keys:', Object.keys(items[0] ?? {}).sort().join(', '));
console.log('mapped:', mapProfile(items, handle));
