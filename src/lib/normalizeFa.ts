// Persian/Arabic text normalisation, copied from trust-me src/domain/normalize.ts (PRD §8 categories).
// Keep the logic identical so category names normalise the same way in both apps.
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

// Arabic letter variants -> Persian forms.
const LETTER_MAP: Record<string, string> = {
  'ي': 'ی', // Arabic yeh (U+064A)
  'ى': 'ی', // Alef maksura (U+0649)
  'ك': 'ک', // Arabic kaf (U+0643)
  'ة': 'ه', // Teh marbuta (U+0629)
};

// Harakat (U+064B–U+0652) and tatweel (U+0640).
const DIACRITICS_AND_TATWEEL = /[ً-ْـ]/g;

// Zero-width non-joiner (U+200C) -> space.
const ZWNJ = /‌/g;

// Other zero-width and bidi control characters (removed): ZWSP, ZWJ, LRM, RLM,
// LRE..RLO embeddings/overrides, LRI..PDI isolates, BOM.
const INVISIBLES = /[​‍-‏‪-‮⁦-⁩﻿]/g;

// Arabic yeh, alef maksura, kaf, teh marbuta.
const ARABIC_LETTERS = /[يىكة]/g;

export function toLatinDigits(s: string): string {
  let out = '';
  for (const ch of s) {
    const p = PERSIAN_DIGITS.indexOf(ch);
    const a = ARABIC_INDIC_DIGITS.indexOf(ch);
    if (p !== -1) out += String(p);
    else if (a !== -1) out += String(a);
    else out += ch;
  }
  return out;
}

export function toPersianDigits(s: string | number): string {
  let out = '';
  for (const ch of String(s)) {
    out += /[0-9]/.test(ch) ? PERSIAN_DIGITS[Number(ch)] : ch;
  }
  return out;
}

export function normalizeFa(s: string): string {
  let out = s.replace(INVISIBLES, '').replace(ZWNJ, ' ').replace(DIACRITICS_AND_TATWEEL, '');
  out = out.replace(ARABIC_LETTERS, (ch) => LETTER_MAP[ch] ?? ch);
  out = toLatinDigits(out);
  return out.replace(/\s+/g, ' ').trim().toLowerCase();
}
