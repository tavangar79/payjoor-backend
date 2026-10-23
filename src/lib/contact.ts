// Shop contact normalisation (PRD §5.6, §8 shops.contact): email lowercase, website a full https:// URL,
// phone in international form (+98… for Iranian numbers). Each returns null when the input isn't valid.
import { toLatinDigits } from './normalizeFa.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(input: string): string | null {
  const email = input.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

/** Adds `https://` when there is no scheme and upgrades `http://`; only http(s) URLs with a dotted host. */
export function normalizeWebsite(input: string): string | null {
  let raw = input.trim();
  if (!raw) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = `https://${raw.replace(/^\/+/, '')}`;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!url.hostname.includes('.') || url.username || url.password) return null;
  url.protocol = 'https:';
  return url.toString();
}

/**
 * Iranian numbers become `+98…` (mobile `09…`, landline `0…`, or without the leading 0);
 * `00…` becomes `+…`; anything else must already be `+` and 8–15 digits.
 */
export function normalizePhone(input: string): string | null {
  const s = toLatinDigits(input).replace(/[\s\-().‌]/g, '');
  let digits: string;
  if (s.startsWith('+')) digits = s.slice(1);
  else if (s.startsWith('00')) digits = s.slice(2);
  else if (/^0\d{10}$/.test(s)) digits = `98${s.slice(1)}`;
  else if (/^9\d{9}$/.test(s)) digits = `98${s}`;
  else return null;
  if (!/^\d{8,15}$/.test(digits)) return null;
  if (digits.startsWith('980')) digits = `98${digits.slice(3)}`;
  return `+${digits}`;
}
