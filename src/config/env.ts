// Environment variables, validated at startup (PRD §11).
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  PUBLIC_BASE_URL: z.url(),
  // True behind one trusted reverse proxy, so req.ip (login lockout key) is the real client IP.
  TRUST_PROXY: z.stringbool().default(false),
  CONTACT_EMAIL: z.email(),

  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),

  META_APP_ID: z.string().min(1),
  META_APP_SECRET: z.string().min(1),
  META_VERIFY_TOKEN: z.string().min(1),
  IG_ACCESS_TOKEN: z.string().optional(),
  IG_ACCOUNT_ID: z.string().min(1),
  GRAPH_API_VERSION: z.string().default('v23.0'),

  APIFY_TOKEN: z.string().min(1),
  APIFY_BUDGET_STOP_USD: z.coerce.number().default(4.5),
  DAILY_CHECK_CRON: z.string().default('0 9 * * *'),

  SESSION_SECRET: z.string().min(32),
  // Same value as trust-me's: base64 of exactly 32 bytes (PRD §9.1).
  DATA_ENCRYPTION_KEY: z
    .string()
    .transform((v) => Buffer.from(v, 'base64'))
    .refine((b) => b.length === 32, 'DATA_ENCRYPTION_KEY must be base64 of exactly 32 bytes'),
  TRUSTME_MONGODB_URI: z.string().optional(),
  // Only for `npm run admin:create`; never passed as an argument (§9.1).
  ADMIN_PASSWORD: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

export const env: Env = schema.parse(process.env);
