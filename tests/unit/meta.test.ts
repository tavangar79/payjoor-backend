import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { signBody, verifySignature } from '../../src/meta/signature.js';
import { GraphError, sendText } from '../../src/meta/sendApi.js';
import { fakeFetch, json } from '../setup/fakeFetch.js';

describe('webhook signature', () => {
  const body = Buffer.from('{"object":"instagram"}');

  it('accepts the right HMAC and rejects anything else', () => {
    const sig = signBody(body, 'secret');
    expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(verifySignature(body, sig, 'secret')).toBe(true);
    expect(verifySignature(body, sig.toUpperCase().replace('SHA256', 'sha256'), 'secret')).toBe(true);
    expect(verifySignature(body, sig, 'other')).toBe(false);
    expect(verifySignature(Buffer.from('{"object":"x"}'), sig, 'secret')).toBe(false);
    expect(verifySignature(body, undefined, 'secret')).toBe(false);
    expect(verifySignature(body, 'sha1=abc', 'secret')).toBe(false);
    expect(verifySignature(body, sig.slice(0, -1), 'secret')).toBe(false);
  });
});

describe('GET /webhooks/instagram', () => {
  it('echoes the challenge for the right verify token only', async () => {
    const app = createApp();
    const ok = await request(app)
      .get('/webhooks/instagram')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'test-verify-token', 'hub.challenge': '1158201444' });
    expect(ok.status).toBe(200);
    expect(ok.text).toBe('1158201444');
    const bad = await request(app)
      .get('/webhooks/instagram')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': 'x' });
    expect(bad.status).toBe(403);
  });
});

describe('sendText', () => {
  it('posts plain text to the pinned Graph version with a bearer token', async () => {
    const f = fakeFetch([[/graph\.instagram\.com/, () => json({ recipient_id: '1', message_id: 'm1' })]]);
    expect(await sendText('123', 'سلام', { token: 'tok', fetch: f })).toEqual({ messageId: 'm1' });
    const [url, init] = f.mock.calls[0]!;
    expect(String(url)).toBe('https://graph.instagram.com/v23.0/me/messages');
    expect(init).toMatchObject({ method: 'POST', headers: { Authorization: 'Bearer tok' } });
    expect(JSON.parse(String(init?.body))).toEqual({ recipient: { id: '123' }, message: { text: 'سلام' } });
  });

  it('marks 5xx, rate limits and network errors retryable, other 4xx not', async () => {
    const fail = (status: number, code?: number) =>
      sendText('1', 'x', { token: 't', fetch: fakeFetch([[/./, () => json({ error: { message: 'e', code } }, status)]]) }).then(
        () => ({ retryable: undefined }),
        (e: GraphError) => e,
      );
    expect((await fail(500)).retryable).toBe(true);
    expect((await fail(400, 613)).retryable).toBe(true);
    expect((await fail(400, 100)).retryable).toBe(false);
    expect((await fail(403, 10)).retryable).toBe(false);
    const down = await sendText('1', 'x', { token: 't', fetch: fakeFetch([[/./, () => Promise.reject(new Error('reset'))]]) }).catch((e) => e);
    expect(down).toBeInstanceOf(GraphError);
    expect(down.retryable).toBe(true);
  });
});
