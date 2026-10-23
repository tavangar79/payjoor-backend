// Worker process entry (`npm run worker`), separate from the web process (PRD §11).
import { logger } from './lib/logger.js';

// TODO: connect MongoDB and Redis, start every worker in src/queues/workers/,
// and register the job schedulers in src/queues/schedulers.ts.
logger.info('worker process started');
