// Environment variables, validated at startup (PRD §11).
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  // The website's public URL (web/), used for the data-deletion status link.
  PUBLIC_BASE_URL: z.url(),
  // True behind one trusted reverse proxy, so req.ip (login lockout key) is the real client IP.
  TRUST_PROXY: z.stringbool().default(false),

  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),

  // Store incoming message text in dmEvents.text (debugging only, §8).
  DM_STORE_TEXT: z.stringbool().default(false),

  // BoxAPI (boxapi.ir): DM & Comment API (X-Api-Key), Instagram Data API and AI API (Bearer tokens).
  BOXAPI_INSTAGRAM_DM_TOKEN: z.string().optional(),
  BOXAPI_INSTAGRAM_TOKEN: z.string().optional(),
  BOXAPI_AI_TOKEN: z.string().optional(),
  // Webhook secret generated in the BoxAPI panel; POST /webhooks/boxapi rejects everything until it's set.
  BOXAPI_WEBHOOK_SECRET: z.string().optional(),
  // DM & Comment API base (send_message, accounts): SendBox's host for servers outside Iran.
  BOXAPI_DM_BASE_URL: z
    .url()
    .default('https://api.sendbox.chat/api/v1')
    .transform((v) => v.replace(/\/+$/, '')),
  // Data API host: instagram.boxpi.ir outside Iran, boxapi.ir inside (§10). Some tokens only work on boxapi.ir.
  BOXAPI_INSTAGRAM_BASE_URL: z
    .url()
    .default('https://instagram.boxpi.ir')
    .transform((v) => v.replace(/\/+$/, '')),

  // Comma-separated handles tagged in reviewer posts that aren't shops, e.g. sponsors (§6.1).
  REVIEW_IGNORE_HANDLES: z
    .string()
    .default('')
    .transform((v) => v.split(',').map((h) => h.trim().replace(/^@/, '').toLowerCase()).filter(Boolean)),
  DAILY_CHECK_CRON: z.string().default('0 9 * * *'),

  SESSION_SECRET: z.string().min(32),
  // Same value as pagesanj's: base64 of exactly 32 bytes (PRD §9.1).
  DATA_ENCRYPTION_KEY: z
    .string()
    .transform((v) => Buffer.from(v, 'base64'))
    .refine((b) => b.length === 32, 'DATA_ENCRYPTION_KEY must be base64 of exactly 32 bytes'),
  PAGESANJ_MONGODB_URI: z.string().optional(),
  // Only for `npm run admin:create`; never passed as an argument (§9.1).
  ADMIN_PASSWORD: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

export const env: Env = schema.parse(process.env);
