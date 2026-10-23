import { afterEach, describe, expect, it } from 'vitest';
import { useMongo } from '../setup/mongo.js';
import { fakeFetch, json } from '../setup/fakeFetch.js';
import { env } from '../../src/config/env.js';
import { decryptField } from '../../src/lib/encryptField.js';
import { META_TOKEN_AAD, MetaToken } from '../../src/models/MetaToken.js';
import { getAccessToken, refreshToken } from '../../src/meta/token.js';

useMongo();

afterEach(() => {
  env.IG_ACCESS_TOKEN = undefined;
});

describe('meta token', () => {
  it('needs a seed when nothing is stored', async () => {
    await expect(getAccessToken()).rejects.toThrow('no_meta_token');
  });

  it('seeds from IG_ACCESS_TOKEN, stored encrypted', async () => {
    env.IG_ACCESS_TOKEN = 'IGAAseed';
    expect(await getAccessToken()).toBe('IGAAseed');
    const doc = await MetaToken.findOne().lean();
    expect(doc?.accessTokenEnc).not.toContain('IGAAseed');
    expect(decryptField(doc!.accessTokenEnc, env.DATA_ENCRYPTION_KEY, META_TOKEN_AAD)).toBe('IGAAseed');
    env.IG_ACCESS_TOKEN = 'ignored-once-stored';
    expect(await getAccessToken()).toBe('IGAAseed');
  });

  it('refreshes and stores the new token with its expiry', async () => {
    env.IG_ACCESS_TOKEN = 'IGAAold';
    const f = fakeFetch([[/refresh_access_token/, () => json({ access_token: 'IGAAnew', token_type: 'bearer', expires_in: 5_184_000 })]]);
    const expiresAt = await refreshToken(f);
    const url = new URL(String(f.mock.calls[0]![0]));
    expect(url.searchParams.get('grant_type')).toBe('ig_refresh_token');
    expect(url.searchParams.get('access_token')).toBe('IGAAold');
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 59 * 24 * 3600 * 1000);
    expect(await getAccessToken()).toBe('IGAAnew');
  });

  it('keeps the old token when the refresh fails', async () => {
    env.IG_ACCESS_TOKEN = 'IGAAold';
    const f = fakeFetch([[/./, () => json({ error: { message: 'Invalid OAuth access token', code: 190 } }, 400)]]);
    await expect(refreshToken(f)).rejects.toThrow('token refresh 400: Invalid OAuth access token');
    expect(await getAccessToken()).toBe('IGAAold');
  });
});
