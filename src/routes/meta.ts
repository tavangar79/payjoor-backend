// Meta callbacks (PRD §7.3): data deletion and deauthorize, both with a verified `signed_request`.
import express, { Router } from 'express';
import { logger } from '../lib/logger.js';
import { parseSignedRequest } from '../meta/signedRequest.js';
import { hashIgsid, requestDeletion, statusUrl } from '../services/deletion.js';

export const metaRouter = Router();

// Meta posts `signed_request=...` as a form.
metaRouter.use(express.urlencoded({ extended: false, limit: '10kb' }));

function verified(body: unknown) {
  return parseSignedRequest((body as { signed_request?: unknown } | undefined)?.signed_request);
}

metaRouter.post('/data-deletion', async (req, res) => {
  const sr = verified(req.body);
  if (!sr) {
    res.status(400).json({ error: 'invalid_signed_request' });
    return;
  }
  const { code, deleted } = await requestDeletion(sr.user_id);
  logger.info({ userHash: hashIgsid(sr.user_id).slice(0, 12), deleted }, 'data deletion request');
  res.json({ url: statusUrl(code), confirmation_code: code });
});

metaRouter.post('/deauthorize', (req, res) => {
  const sr = verified(req.body);
  if (!sr) {
    res.status(400).json({ error: 'invalid_signed_request' });
    return;
  }
  logger.info({ userHash: hashIgsid(sr.user_id).slice(0, 12) }, 'app deauthorized');
  res.sendStatus(200);
});
