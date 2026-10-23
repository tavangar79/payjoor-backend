// M0 spike (PRD §5.3, §14; plan task 6.3): `npm run spike:webhook`, development only.
// Answers Meta's subscription check and writes every raw POST body to tests/fixtures/webhooks/raw-<time>.json,
// with whether its signature checked out. Expose it with a tunnel, subscribe the webhook, then DM the account
// a shared profile, post, reel, plain link and text. Replace real IGSIDs before committing any fixture.
import { mkdir, writeFile } from 'node:fs/promises';
import express from 'express';
import { env } from '../src/config/env.js';
import { SIGNATURE_HEADER, verifySignature } from '../src/meta/signature.js';

if (env.NODE_ENV === 'production') {
  console.error('webhook-spike is for development only');
  process.exit(1);
}

const dir = new URL('../tests/fixtures/webhooks/', import.meta.url);
await mkdir(dir, { recursive: true });

const app = express();
app.get('/webhooks/instagram', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === env.META_VERIFY_TOKEN) {
    res.send(String(req.query['hub.challenge'] ?? ''));
    return;
  }
  res.sendStatus(403);
});
app.post('/webhooks/instagram', express.raw({ type: () => true, limit: '1mb' }), async (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const signatureOk = verifySignature(raw, req.get(SIGNATURE_HEADER));
  const file = new URL(`raw-${Date.now()}.json`, dir);
  let body: unknown = raw.toString('utf8');
  try {
    body = JSON.parse(raw.toString('utf8'));
  } catch {
    // keep as text
  }
  await writeFile(file, `${JSON.stringify({ signatureOk, body }, null, 2)}\n`);
  console.log(`saved ${file.pathname} (signature ${signatureOk ? 'ok' : 'BAD'})`);
  res.sendStatus(200);
});

app.listen(env.PORT, () => console.log(`webhook spike on :${env.PORT}/webhooks/instagram`));
