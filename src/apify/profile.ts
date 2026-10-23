// Shop profile fetch: image and contact details from one profile-scraper item (PRD §5.6).
// Field names follow the actor's documented output; the email and phone names are not documented, so
// several candidates are read. Confirm against a real run (tests/fixtures/apify/profile.json, plan task 5.3).
import { normalizeEmail, normalizePhone, normalizeWebsite } from '../lib/contact.js';

export type ProfileItem = Record<string, unknown>;

export type ScrapedProfile = {
  username: string;
  fullName?: string;
  imageUrl?: string;
  email?: string;
  website?: string;
  phone?: string;
};

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const first = (item: ProfileItem, keys: string[]) => keys.map((k) => str(item[k])).find(Boolean);

function website(item: ProfileItem): string | undefined {
  const urls = Array.isArray(item.externalUrls) ? (item.externalUrls as { url?: unknown }[]) : [];
  const raw = str(item.externalUrl) ?? urls.map((u) => str(u?.url)).find(Boolean);
  return raw ? (normalizeWebsite(raw) ?? undefined) : undefined;
}

function phone(item: ProfileItem): string | undefined {
  const raw = first(item, ['businessPhoneNumber', 'publicPhoneNumber', 'contactPhoneNumber', 'public_phone_number']);
  if (!raw) return undefined;
  const code = first(item, ['publicPhoneCountryCode', 'public_phone_country_code']);
  const withCode = code && !raw.startsWith('+') && !raw.startsWith('0') ? `+${code}${raw}` : raw;
  return normalizePhone(withCode) ?? undefined;
}

/** Maps the item for `handle`, or returns null if the actor found no such profile. Invalid contact values are dropped. */
export function mapProfile(items: ProfileItem[], handle: string): ScrapedProfile | null {
  const item = items.find((i) => str(i.username)?.toLowerCase() === handle && !i.error);
  if (!item) return null;
  const email = first(item, ['businessEmail', 'publicEmail', 'public_email', 'business_email']);
  return {
    username: handle,
    fullName: str(item.fullName),
    imageUrl: first(item, ['profilePicUrlHD', 'profilePicUrl']),
    email: email ? (normalizeEmail(email) ?? undefined) : undefined,
    website: website(item),
    phone: phone(item),
  };
}
