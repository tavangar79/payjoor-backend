// Instagram handle normalisation (PRD §5.3, §8): lowercase, no `@`, no trailing `/` or query string.
const HANDLE_RE = /^[a-z0-9._]{1,30}$/;

/** Returns the normalised handle, or null if the input isn't a valid Instagram handle. */
export function normalizeHandle(input: string): string | null {
  const handle = input
    .trim()
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '')
    .replace(/^@/, '')
    .toLowerCase();
  return HANDLE_RE.test(handle) ? handle : null;
}
