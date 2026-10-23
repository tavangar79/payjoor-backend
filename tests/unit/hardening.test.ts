import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { pino } from 'pino';
import request from 'supertest';
import { loggerOptions, redactUrl, serializeReq } from '../../src/lib/logger.js';
import { createApp } from '../../src/app.js';

function capture() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      lines.push(String(chunk));
      cb();
    },
  });
  return { log: pino({ ...loggerOptions, level: 'info' }, stream), lines };
}

describe('log redaction', () => {
  it('redacts tokens, signed_request, cookies and message text, top level or nested', () => {
    const { log, lines } = capture();
    log.info({
      token: 'IGAAsecret1',
      access_token: 'IGAAsecret2',
      signed_request: 'sig.payload',
      text: 'my private message',
      message: { text: 'nested private message' },
      job: { accessToken: 'IGAAsecret3', text: 'another message' },
      req: { headers: { cookie: 'ps_admin=abc', authorization: 'Bearer IGAAsecret4', 'x-csrf-token': 'csrf' } },
      handle: 'maashmamad',
    }, 'payload');
    const out = lines.join('');
    for (const secret of ['IGAAsecret', 'sig.payload', 'private message', 'another message', 'ps_admin=abc', 'csrf"']) {
      expect(out).not.toContain(secret);
    }
    expect(out).toContain('maashmamad');
    expect(out).toContain('[redacted]');
  });

  it('masks secret query values in request URLs', () => {
    expect(redactUrl('/webhooks/instagram?hub.mode=subscribe&hub.verify_token=s3cret&hub.challenge=1')).toBe(
      '/webhooks/instagram?hub.mode=subscribe&hub.verify_token=[redacted]&hub.challenge=1',
    );
    expect(redactUrl('/x?access_token=abc#frag')).toBe('/x?access_token=[redacted]#frag');
    expect(redactUrl('/en/data-deletion/status?code=abc')).toBe('/en/data-deletion/status?code=abc');
    expect(serializeReq({ method: 'GET', url: '/a?token=t' })).toEqual({ method: 'GET', url: '/a?token=[redacted]' });
    expect(serializeReq({ url: '/w?hub.verify_token=s', query: { 'hub.verify_token': 's', 'hub.mode': 'subscribe' } }).query).toEqual({
      'hub.verify_token': '[redacted]',
      'hub.mode': 'subscribe',
    });
  });
});

describe('security headers', () => {
  it('sets them on every response, with a CSP on our HTML only', async () => {
    const app = createApp();
    const health = await request(app).get('/healthz');
    expect(health.headers).toMatchObject({
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'strict-origin-when-cross-origin',
    });
    expect(health.headers['x-powered-by']).toBeUndefined();
    expect(health.headers['content-security-policy']).toBeUndefined();
    const page = await request(app).get('/').set('User-Agent', 'facebookexternalhit/1.1');
    expect(page.status).toBe(302);
    expect(page.headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });

  it('caps body sizes', async () => {
    const app = createApp();
    const big = await request(app).post('/meta/data-deletion').type('form').send({ signed_request: 'x'.repeat(20_000) });
    expect(big.status).toBe(413);
    const json = await request(app).post('/admin/api/auth/login').send({ username: 'x'.repeat(200_000) });
    expect(json.status).toBe(413);
  });
});
