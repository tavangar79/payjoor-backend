// Download a profile picture from Instagram's CDN (PRD §5.6). The URL comes from scraped data, so only
// https URLs on Instagram/Facebook CDN hosts are fetched, with a timeout and a byte cap.
import { MAX_IMAGE_BYTES } from './imageCheck.js';

const ALLOWED_HOST = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/;

export class DownloadError extends Error {}

export async function downloadImage(url: string, fetchImpl: typeof fetch = fetch): Promise<Buffer> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new DownloadError('bad_url');
  }
  if (parsed.protocol !== 'https:' || !ALLOWED_HOST.test(parsed.hostname)) throw new DownloadError('host_not_allowed');

  const res = await fetchImpl(parsed, { redirect: 'error', signal: AbortSignal.timeout(20_000) }).catch((err) => {
    throw new DownloadError(`fetch_failed: ${err instanceof Error ? err.message : String(err)}`);
  });
  if (!res.ok || !res.body) throw new DownloadError(`http_${res.status}`);
  if (Number(res.headers.get('content-length') ?? 0) > MAX_IMAGE_BYTES) throw new DownloadError('too_large');

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of res.body) {
    size += chunk.length;
    if (size > MAX_IMAGE_BYTES) throw new DownloadError('too_large');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
