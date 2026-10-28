import { describe, expect, it } from 'vitest';
import { decryptField, encryptField } from '../../src/lib/encryptField.js';

const key = Buffer.alloc(32, 1);

describe('encryptField', () => {
  it('round-trips with a random IV', () => {
    const t = encryptField('secret', key, 'admin:totp');
    expect(t).not.toBe(encryptField('secret', key, 'admin:totp'));
    expect(t.startsWith('v1:')).toBe(true);
    expect(decryptField(t, key, 'admin:totp')).toBe('secret');
  });

  it('decrypts a token produced by pagesanj', () => {
    // Generated with pagesanj's src/server/crypto.ts, key = 32 bytes of 0x07.
    const fromPagesanj = 'v1:0wzVUZs1WUQGbjVM:mYmcaK+W8QNj4e5iZ2BCDw==:KAT6TUSbKcyyz1dHl3xUEQ==';
    expect(decryptField(fromPagesanj, Buffer.alloc(32, 7), 'admin:totp')).toBe('JBSWY3DPEHPK3PXP');
  });

  it('rejects the wrong AAD, wrong key, tampering and bad versions', () => {
    const t = encryptField('x', key, 'admin:totp');
    expect(() => decryptField(t, key, 'meta:token')).toThrow();
    expect(() => decryptField(t, Buffer.alloc(32, 2), 'admin:totp')).toThrow();
    const [v, iv, tag, ct] = t.split(':') as [string, string, string, string];
    const flipped = Buffer.from(ct, 'base64');
    flipped[0]! ^= 1;
    expect(() => decryptField([v, iv, tag, flipped.toString('base64')].join(':'), key, 'admin:totp')).toThrow();
    expect(() => decryptField(['v2', iv, tag, ct].join(':'), key, 'admin:totp')).toThrow();
    expect(() => decryptField('garbage', key)).toThrow();
  });

  it('uses DATA_ENCRYPTION_KEY from env by default', () => {
    expect(decryptField(encryptField('y'))).toBe('y');
  });
});
