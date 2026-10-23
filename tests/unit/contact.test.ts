import { describe, expect, it } from 'vitest';
import { normalizeEmail, normalizePhone, normalizeWebsite } from '../../src/lib/contact.js';
import { slugify } from '../../src/lib/slug.js';

describe('normalizeEmail', () => {
  it('lowercases and trims, rejects non-emails', () => {
    expect(normalizeEmail('  Shop@Example.COM ')).toBe('shop@example.com');
    expect(normalizeEmail('no-at-sign')).toBeNull();
    expect(normalizeEmail('a@b')).toBeNull();
  });
});

describe('normalizeWebsite', () => {
  it('makes a full https:// URL', () => {
    expect(normalizeWebsite('example.com')).toBe('https://example.com/');
    expect(normalizeWebsite('http://Example.com/shop?x=1')).toBe('https://example.com/shop?x=1');
    expect(normalizeWebsite('https://linktr.ee/maash')).toBe('https://linktr.ee/maash');
  });

  it('rejects other schemes and junk', () => {
    expect(normalizeWebsite('javascript:alert(1)')).toBeNull();
    expect(normalizeWebsite('ftp://example.com')).toBeNull();
    expect(normalizeWebsite('localhost')).toBeNull();
    expect(normalizeWebsite('https://user:pw@example.com')).toBeNull();
    expect(normalizeWebsite('')).toBeNull();
  });
});

describe('normalizePhone', () => {
  it('puts Iranian numbers in +98 form', () => {
    expect(normalizePhone('0912 123 4567')).toBe('+989121234567');
    expect(normalizePhone('۰۹۱۲-۱۲۳-۴۵۶۷')).toBe('+989121234567');
    expect(normalizePhone('9121234567')).toBe('+989121234567');
    expect(normalizePhone('021 1234 5678')).toBe('+982112345678');
    expect(normalizePhone('+98 (0)912 123 4567')).toBe('+989121234567');
    expect(normalizePhone('0098 912 123 4567')).toBe('+989121234567');
  });

  it('keeps other international numbers and rejects the rest', () => {
    expect(normalizePhone('+44 20 7946 0958')).toBe('+442079460958');
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('call me')).toBeNull();
    expect(normalizePhone('+1')).toBeNull();
  });
});

describe('slugify', () => {
  it('keeps letters and digits, turns the rest into dashes', () => {
    expect(slugify('maash.mamad_shop')).toBe('maash-mamad-shop');
    expect(slugify('  Home & Garden ')).toBe('home-garden');
    expect(slugify('پوشاک زنانه')).toBe('پوشاک-زنانه');
    expect(slugify('كيف')).toBe('کیف');
  });
});
