// BoxAPI AI API (PRD §10): OpenAI-compatible chat completions at ai.boxapi.ir, answered as strict JSON.
// The token goes in the Authorization header only; prompts and replies are never logged here.
import { env } from '../config/env.js';
import { BoxApiError } from './dm.js';

export type AiOptions = { token?: string; fetch?: typeof fetch; baseUrl?: string };

export type ChatJsonRequest = {
  model: string;
  system: string;
  user: string;
  schemaName: string;
  schema: object;
  maxTokens: number;
};

type Completion = {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  usage?: { cost?: number };
};

/** One strict-JSON chat completion. Returns the parsed reply and its cost in dollars (`usage.cost`). */
export async function chatJson<T>(req: ChatJsonRequest, opts: AiOptions = {}): Promise<{ value: T; costUsd: number }> {
  const { token = env.BOXAPI_AI_TOKEN, fetch: fetchImpl = fetch, baseUrl = env.BOXAPI_AI_BASE_URL } = opts;
  if (!token) throw new BoxApiError('no_boxapi_ai_token: set BOXAPI_AI_TOKEN', 401);
  // openai/* models reject max_tokens; the others (anthropic/*, ...) use it.
  const tokenField = req.model.startsWith('openai/') ? 'max_completion_tokens' : 'max_tokens';
  let res: Response;
  try {
    res = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: req.model,
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.user },
        ],
        [tokenField]: req.maxTokens,
        response_format: { type: 'json_schema', json_schema: { name: req.schemaName, strict: true, schema: req.schema } },
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    throw new BoxApiError(`ai api request failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: { message?: unknown }; message?: unknown } | null;
    const detail = err?.error?.message ?? err?.message ?? res.statusText;
    // 402: credit ran out. It is temporary, so the job retries after a top-up.
    throw new BoxApiError(
      `ai api ${res.status}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`,
      res.status,
      res.status === 402 ? true : undefined,
    );
  }
  const data = (await res.json().catch(() => null)) as Completion | null;
  const choice = data?.choices?.[0];
  if (choice?.finish_reason === 'length') throw new BoxApiError('ai api reply cut off (finish_reason length)', undefined, true);
  const content = choice?.message?.content;
  if (typeof content !== 'string') throw new BoxApiError('ai api returned no content', undefined, true);
  let value: T;
  try {
    value = JSON.parse(content) as T;
  } catch {
    throw new BoxApiError('ai api returned content that is not JSON', undefined, true);
  }
  return { value, costUsd: data?.usage?.cost ?? 0 };
}
