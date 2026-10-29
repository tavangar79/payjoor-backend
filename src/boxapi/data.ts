// BoxAPI Instagram Data API (PRD §5.3, §5.6, §6.2): post info, a user's posts, a user's profile, request quota.
// Every call is a POST with a Bearer token; the answer is wrapped as { status, response: { status_code, body } }.
// The token goes in the Authorization header, never in a URL or a log.
import { env } from '../config/env.js';
import { BoxApiError } from './dm.js';
import type { BoxApiPost } from './posts.js';
import type { BoxApiProfile } from './profile.js';

export type DataOptions = { token?: string; fetch?: typeof fetch; baseUrl?: string };

type Wrapped<T> = { status?: string; response?: { status_code?: number; body?: T } };

async function call<T>(method: 'GET' | 'POST', path: string, body: unknown, opts: DataOptions): Promise<T> {
  const { token = env.BOXAPI_INSTAGRAM_TOKEN, fetch: fetchImpl = fetch, baseUrl = env.BOXAPI_INSTAGRAM_BASE_URL } = opts;
  if (!token) throw new BoxApiError('no_boxapi_instagram_token: set BOXAPI_INSTAGRAM_TOKEN', 401);
  let res: Response;
  try {
    res = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body !== undefined && { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    throw new BoxApiError(`data api request failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { data?: { message?: unknown }; message?: unknown } | null;
    const detail = err?.data?.message ?? err?.message ?? res.statusText;
    throw new BoxApiError(`data api ${res.status}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`, res.status);
  }
  return (await res.json()) as T;
}

/** Unwraps `response.body`; a non-2xx `response.status_code` (Instagram's answer) becomes a BoxApiError. */
async function instagram<T>(path: string, body: unknown, opts: DataOptions): Promise<T> {
  const wrapped = await call<Wrapped<T>>('POST', `/api/instagram${path}`, body, opts);
  const status = wrapped.response?.status_code ?? 0;
  if (status < 200 || status >= 300 || !wrapped.response?.body) {
    throw new BoxApiError(`instagram ${status || 'no_response'} for ${path}`, status || 502);
  }
  return wrapped.response.body;
}

export type MediaPage = { items: BoxApiPost[]; nextMaxId?: string; moreAvailable: boolean };

/** One post by shortcode (§5.3). */
export async function getMediaByShortcode(shortcode: string, opts: DataOptions = {}): Promise<BoxApiPost | null> {
  const body = await instagram<{ items?: BoxApiPost[] }>('/media/get_info_by_shortcode', { shortcode }, opts);
  return body.items?.[0] ?? null;
}

/** One page (at most 12 posts, newest first after any pinned ones) of a user's posts (§6.2). */
export async function getUserMedia(username: string, opts: DataOptions & { maxId?: string } = {}): Promise<MediaPage> {
  const { maxId, ...rest } = opts;
  const body = await instagram<{ items?: BoxApiPost[]; next_max_id?: string | null; more_available?: boolean }>(
    '/user/get_media_by_username',
    { username, count: 12, ...(maxId && { max_id: maxId }) },
    rest,
  );
  return { items: body.items ?? [], nextMaxId: body.next_max_id ?? undefined, moreAvailable: Boolean(body.more_available && body.next_max_id) };
}

/** A user's profile (§5.6), or null if Instagram returned no user. */
export async function getUserInfo(username: string, opts: DataOptions = {}): Promise<BoxApiProfile | null> {
  const body = await instagram<{ user?: BoxApiProfile; data?: { user?: BoxApiProfile } }>('/user/get_info_by_username', { username }, opts);
  return body.user ?? body.data?.user ?? null;
}

export type DataQuota = { requestUsed: number; requestLimit: number; requestLeft: number; planExpiration: string | null };

/** The plan's request quota (`GET /api/my`), shown on the admin Jobs screen. */
export async function getQuota(opts: DataOptions = {}): Promise<DataQuota> {
  const my = await call<{ request_used?: number; request_limit?: number; request_left?: number; plan_expiration?: string }>(
    'GET',
    '/api/my',
    undefined,
    opts,
  );
  return {
    requestUsed: my.request_used ?? 0,
    requestLimit: my.request_limit ?? 0,
    requestLeft: my.request_left ?? 0,
    planExpiration: my.plan_expiration ?? null,
  };
}
