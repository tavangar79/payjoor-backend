// Worker process entry (`npm run worker`), separate from the web process (PRD §11).
import { connectDb, disconnectDb } from './lib/db.js';
import { logger } from './lib/logger.js';
import { closeQueues } from './queues/queues.js';
import { registerSchedulers } from './queues/schedulers.js';
import { closeWorkers, startWorkers } from './queues/startWorkers.js';
import { workerDefinitions } from './queues/workers/index.js';

await connectDb();
const workers = startWorkers(workerDefinitions);
await registerSchedulers();
logger.info({ queues: workerDefinitions.map((d) => d.queue) }, 'worker process started');

async function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down workers');
  await closeWorkers(workers);
  await closeQueues();
  await disconnectDb();
  process.exit(0);
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
