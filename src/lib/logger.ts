// Structured JSON logging with pino (PRD §11, §12).
// Message bodies are only logged at debug level, under `debugText`. Tokens, cookies, signed_request and
// message text are redacted wherever they appear (top level or one object down), and secret query values
// are masked in request URLs (the webhook verify call carries hub.verify_token).
import { pino, type LoggerOptions } from 'pino';
import { env } from '../config/env.js';

const SECRET_KEYS = ['access_token', 'accessToken', 'token', 'signed_request', 'text'];

export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
  'message.text',
  '*.message.text',
  ...SECRET_KEYS,
  ...SECRET_KEYS.map((k) => `*.${k}`),
];

const SECRET_QUERY_KEYS = ['hub.verify_token', 'access_token', 'signed_request', 'token'];
const SECRET_QUERY = /([?&](?:hub\.verify_token|access_token|signed_request|token)=)[^&#]*/gi;

export function redactUrl(url: string | undefined): string | undefined {
  return url?.replace(SECRET_QUERY, '$1[redacted]');
}

export const loggerOptions: LoggerOptions = {
  level: env.LOG_LEVEL,
  redact: { paths: REDACT_PATHS, censor: '[redacted]' },
};

export const logger = pino({
  ...loggerOptions,
  transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
});

type SerializedReq = { url?: string; query?: Record<string, unknown>; [key: string]: unknown };

/** pino-http request serializer: the standard fields, with secret query values masked in `url` and `query`. */
export function serializeReq(req: SerializedReq): SerializedReq {
  const out: SerializedReq = { ...req, url: redactUrl(req.url) };
  if (req.query && typeof req.query === 'object') {
    out.query = Object.fromEntries(
      Object.entries(req.query).map(([k, v]) => [k, SECRET_QUERY_KEYS.includes(k) ? '[redacted]' : v]),
    );
  }
  return out;
}

export function jobLogger(queue: string, jobId: string | undefined) {
  return logger.child({ queue, jobId });
}
