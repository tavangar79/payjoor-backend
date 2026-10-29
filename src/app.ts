// Express app wiring. API only: the website (web/) and admin app (admin/) run as their own services.
import express from 'express';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger, serializeReq } from './lib/logger.js';
import { errorHandler } from './lib/errorHandler.js';
import { securityHeaders } from './lib/securityHeaders.js';
import { isDbConnected } from './lib/db.js';
import { webhooksRouter } from './routes/webhooks.js';
import { mediaRouter } from './routes/media.js';
import { adminRouter } from './routes/admin/index.js';
import { publicRouter } from './routes/public.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (env.TRUST_PROXY) app.set('trust proxy', 1);
  app.use(pinoHttp({ logger, serializers: { req: serializeReq } }));
  app.use(securityHeaders);

  app.get('/healthz', (_req, res) => {
    const db = isDbConnected();
    res.status(db ? 200 : 503).json({ ok: db, db });
  });

  // Webhooks need the raw body for the HMAC check, so they mount before any JSON parser.
  app.use('/webhooks', webhooksRouter);
  app.use('/media', mediaRouter);
  app.use('/api', publicRouter);
  app.use('/admin', adminRouter);

  app.use(errorHandler);

  return app;
}
