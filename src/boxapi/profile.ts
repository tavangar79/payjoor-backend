// Shop profile (PRD §5.6): image and contact details from a Data API `user/get_info_by_username` user, checked
// against a real response (tests/fixtures/boxapi/user-info.maashmamad.json). Only what the page itself shows.
import { normalizeEmail, normalizePhone, normalizeWebsite } from '../lib/contact.js';

export type BoxApiProfile = {
  username?: string;
  full_name?: string;
  hd_profile_pic_url_info?: { url?: string };
  profile_pic_url_hd?: string;
  profile_pic_url?: string;
  external_url?: string;
  bio_links?: { url?: string }[];
  public_email?: string;
  business_email?: string;
  contact_phone_number?: string;
  public_phone_number?: string;
  public_phone_country_code?: string;
  business_phone_number?: string;
  [key: string]: unknown;
};

export type ScrapedProfile = {
  username: string;
  fullName?: string;
  imageUrl?: string;
  email?: string;
  website?: string;
  phone?: string;
};

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

function website(user: BoxApiProfile): string | undefined {
  const raw = str(user.external_url) ?? (user.bio_links ?? []).map((l) => str(l?.url)).find(Boolean);
  return raw ? (normalizeWebsite(raw) ?? undefined) : undefined;
}

function phone(user: BoxApiProfile): string | undefined {
  // contact_phone_number already has the country code (e.g. +987136311002).
  const full = str(user.contact_phone_number) ?? str(user.business_phone_number);
  if (full) return normalizePhone(full) ?? undefined;
  const raw = str(user.public_phone_number);
  if (!raw) return undefined;
  const code = str(user.public_phone_country_code);
  return normalizePhone(code && !raw.startsWith('+') && !raw.startsWith('0') ? `+${code}${raw}` : raw) ?? undefined;
}

/** Maps the user for `handle`, or null if the answer is for someone else. Invalid contact values are dropped. */
export function mapProfile(user: BoxApiProfile | null, handle: string): ScrapedProfile | null {
  if (!user || str(user.username)?.toLowerCase() !== handle) return null;
  const email = str(user.public_email) ?? str(user.business_email);
  return {
    username: handle,
    fullName: str(user.full_name),
    imageUrl: str(user.hd_profile_pic_url_info?.url) ?? str(user.profile_pic_url_hd) ?? str(user.profile_pic_url),
    email: email ? (normalizeEmail(email) ?? undefined) : undefined,
    website: website(user),
    phone: phone(user),
  };
}
