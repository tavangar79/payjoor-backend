// Structured JSON logging with pino (PRD §11).
// Message bodies are only logged at debug level, under `debugText`.
import { pino } from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.access_token',
      '*.accessToken',
      '*.token',
      '*.signed_request',
      '*.text',
      '*.message.text',
    ],
    censor: '[redacted]',
  },
  transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
});

export function jobLogger(queue: string, jobId: string | undefined) {
  return logger.child({ queue, jobId });
}
