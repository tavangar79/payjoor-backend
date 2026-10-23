// Express app wiring.
import express from 'express';
import { pinoHttp } from 'pino-http';
import { logger } from './lib/logger.js';
import { webhooksRouter } from './routes/webhooks.js';
import { metaRouter } from './routes/meta.js';
import { mediaRouter } from './routes/media.js';
import { adminRouter } from './routes/admin/index.js';
import { landingRouter } from './routes/landing.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(pinoHttp({ logger }));

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true });
  });

  // Webhooks need the raw body for the HMAC check, so they mount before any JSON parser.
  app.use('/webhooks', webhooksRouter);
  app.use('/meta', metaRouter);
  app.use('/media', mediaRouter);
  app.use('/admin', adminRouter);
  app.use('/', landingRouter);

  return app;
}
