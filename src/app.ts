// Express app wiring.
import express from 'express';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './lib/errorHandler.js';
import { isDbConnected } from './lib/db.js';
import { webhooksRouter } from './routes/webhooks.js';
import { metaRouter } from './routes/meta.js';
import { mediaRouter } from './routes/media.js';
import { adminRouter } from './routes/admin/index.js';
import { landingRouter } from './routes/landing.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (env.TRUST_PROXY) app.set('trust proxy', 1);
  app.use(pinoHttp({ logger }));

  app.get('/healthz', (_req, res) => {
    const db = isDbConnected();
    res.status(db ? 200 : 503).json({ ok: db, db });
  });

  // Webhooks need the raw body for the HMAC check, so they mount before any JSON parser.
  app.use('/webhooks', webhooksRouter);
  app.use('/meta', metaRouter);
  app.use('/media', mediaRouter);
  app.use('/admin', adminRouter);
  app.use('/', landingRouter);

  app.use(errorHandler);

  return app;
}
