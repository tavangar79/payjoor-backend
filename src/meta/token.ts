// The long-lived Instagram token (PRD §8 metaToken, §10.6): stored encrypted (AAD `meta:token`), seeded
// from IG_ACCESS_TOKEN on first use, refreshed weekly. The token is never logged.
import { env } from '../config/env.js';
import { decryptField, encryptField } from '../lib/encryptField.js';
import { META_TOKEN_AAD, META_TOKEN_KEY, MetaToken } from '../models/MetaToken.js';
import { GraphError } from './sendApi.js';

const SIXTY_DAYS_MS = 60 * 24 * 3600 * 1000;
const REFRESH_URL = 'https://graph.instagram.com/refresh_access_token';

async function store(token: string, expiresAt: Date) {
  await MetaToken.updateOne(
    { key: META_TOKEN_KEY },
    { $set: { accessTokenEnc: encryptField(token, env.DATA_ENCRYPTION_KEY, META_TOKEN_AAD), expiresAt, refreshedAt: new Date() } },
    { upsert: true },
  );
}

export async function getAccessToken(): Promise<string> {
  const doc = await MetaToken.findOne({ key: META_TOKEN_KEY }).lean();
  if (doc) return decryptField(doc.accessTokenEnc, env.DATA_ENCRYPTION_KEY, META_TOKEN_AAD);
  if (!env.IG_ACCESS_TOKEN) throw new Error('no_meta_token: set IG_ACCESS_TOKEN');
  // Seeded tokens are assumed fresh; the weekly refresh sets the real expiry.
  await store(env.IG_ACCESS_TOKEN, new Date(Date.now() + SIXTY_DAYS_MS));
  return env.IG_ACCESS_TOKEN;
}

/** `GET refresh_access_token?grant_type=ig_refresh_token` and store the new token. Returns its expiry. */
export async function refreshToken(fetchImpl: typeof fetch = fetch): Promise<Date> {
  const current = await getAccessToken();
  const url = new URL(REFRESH_URL);
  url.searchParams.set('grant_type', 'ig_refresh_token');
  url.searchParams.set('access_token', current);
  let res: Response;
  try {
    res = await fetchImpl(url, { signal: AbortSignal.timeout(30_000) });
  } catch (err) {
    throw new GraphError(`token refresh failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  const body = (await res.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; error?: { message?: string; code?: number } }
    | null;
  if (!res.ok || !body?.access_token) {
    throw new GraphError(`token refresh ${res.status}: ${body?.error?.message ?? 'no token'}`, res.status, body?.error?.code);
  }
  const expiresAt = new Date(Date.now() + (body.expires_in ? body.expires_in * 1000 : SIXTY_DAYS_MS));
  await store(body.access_token, expiresAt);
  return expiresAt;
}
