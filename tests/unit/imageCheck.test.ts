import { describe, expect, it } from 'vitest';
import { MAX_IMAGE_BYTES, checkImage } from '../../src/lib/imageCheck.js';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]);

describe('checkImage', () => {
  it('accepts JPEG, PNG and WebP from the bytes', () => {
    expect(checkImage(jpeg)).toMatchObject({ ok: true, mime: 'image/jpeg' });
    expect(checkImage(png)).toMatchObject({ ok: true, mime: 'image/png' });
    expect(checkImage(webp)).toMatchObject({ ok: true, mime: 'image/webp' });
  });

  it('returns a stable sha256', () => {
    const a = checkImage(jpeg);
    expect(a.ok && a.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(checkImage(jpeg)).toEqual(a);
  });

  it('rejects other types, empty and oversized input', () => {
    expect(checkImage(Buffer.from('GIF89a'))).toEqual({ ok: false, reason: 'unsupported_type' });
    expect(checkImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toEqual({
      ok: false,
      reason: 'unsupported_type',
    });
    expect(checkImage(Buffer.alloc(0))).toEqual({ ok: false, reason: 'empty' });
    const big = Buffer.concat([jpeg, Buffer.alloc(MAX_IMAGE_BYTES)]);
    expect(checkImage(big)).toEqual({ ok: false, reason: 'too_large' });
  });
});
