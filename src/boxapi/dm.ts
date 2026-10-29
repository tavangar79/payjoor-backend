// BoxAPI DM & Comment API (PRD §5.1, §10): send a plain-text reply with POST /service/actions/send_message.
// The result also arrives later as an `action.send_message` webhook; we only check the HTTP answer here.
import { env } from '../config/env.js';

export const sendUrl = () => `${env.BOXAPI_DM_BASE_URL}/service/actions/send_message`;

export class BoxApiError extends Error {
  readonly retryable: boolean;
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'BoxApiError';
    // Network errors, 5xx and 429 are temporary; other 4xx are final.
    this.retryable = status === undefined || status >= 500 || status === 429;
  }
}

export type SendOptions = { token?: string; fetch?: typeof fetch };

export async function sendMessage(accountId: string, recipientId: string, text: string, opts: SendOptions = {}) {
  const { token = env.BOXAPI_INSTAGRAM_DM_TOKEN, fetch: fetchImpl = fetch } = opts;
  if (!token) throw new BoxApiError('no_boxapi_dm_token: set BOXAPI_INSTAGRAM_DM_TOKEN', 401);
  let res: Response;
  try {
    res = await fetchImpl(sendUrl(), {
      method: 'POST',
      headers: { 'X-Api-Key': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: accountId, recipient_id: recipientId, message: text }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    throw new BoxApiError(`send failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: unknown; message?: unknown } | null;
    const detail = body?.error ?? body?.message ?? res.statusText;
    throw new BoxApiError(`send ${res.status}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`, res.status);
  }
}
