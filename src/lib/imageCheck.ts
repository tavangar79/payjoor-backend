// Shop profile image check (PRD §5.6, §12): real JPEG, PNG or WebP from the bytes, at most 2 MB.
import { createHash } from 'node:crypto';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

export type ImageCheck =
  | { ok: true; mime: ImageMime; sha256: string }
  | { ok: false; reason: 'too_large' | 'empty' | 'unsupported_type' };

export function sniffImageMime(b: Buffer): ImageMime | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

export function checkImage(bytes: Buffer): ImageCheck {
  if (bytes.length === 0) return { ok: false, reason: 'empty' };
  if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, reason: 'too_large' };
  const mime = sniffImageMime(bytes);
  if (!mime) return { ok: false, reason: 'unsupported_type' };
  return { ok: true, mime, sha256: createHash('sha256').update(bytes).digest('hex') };
}
