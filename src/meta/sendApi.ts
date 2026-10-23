// Instagram Send API (PRD §10.7): POST graph.instagram.com/<GRAPH_API_VERSION>/me/messages with plain text.
import { env } from '../config/env.js';

// Graph error codes that are temporary: unknown, service, app/user rate limits.
const RETRYABLE_CODES = new Set([1, 2, 4, 17, 32, 341, 613]);

export class GraphError extends Error {
  readonly retryable: boolean;
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: number,
  ) {
    super(message);
    this.name = 'GraphError';
    this.retryable =
      status === undefined || status >= 500 || status === 429 || (code !== undefined && RETRYABLE_CODES.has(code));
  }
}

export type SendOptions = { token: string; fetch?: typeof fetch };

export async function sendText(igsid: string, text: string, opts: SendOptions): Promise<{ messageId?: string }> {
  const { token, fetch: fetchImpl = fetch } = opts;
  let res: Response;
  try {
    res = await fetchImpl(`https://graph.instagram.com/${env.GRAPH_API_VERSION}/me/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: igsid }, message: { text } }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    throw new GraphError(`send failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  const body = (await res.json().catch(() => null)) as
    | { message_id?: string; error?: { message?: string; code?: number } }
    | null;
  if (!res.ok) throw new GraphError(`send ${res.status}: ${body?.error?.message ?? res.statusText}`, res.status, body?.error?.code);
  return { messageId: body?.message_id };
}
