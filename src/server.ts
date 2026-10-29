// Web process entry: Express (webhooks, website, admin).
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDb, disconnectDb } from './lib/db.js';
import { logger } from './lib/logger.js';
import { syncAllIndexes } from './models/index.js';

await connectDb();
if (env.NODE_ENV === 'development') await syncAllIndexes();

const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'web server listening');
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down web server');
  server.close();
  await disconnectDb();
  process.exit(0);
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
