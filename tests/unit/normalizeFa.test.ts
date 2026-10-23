import { describe, expect, it } from 'vitest';
import { normalizeFa, toLatinDigits, toPersianDigits } from '../../src/lib/normalizeFa.js';

describe('normalizeFa', () => {
  it('maps Arabic letters to Persian forms', () => {
    expect(normalizeFa('كيف')).toBe('کیف');
    expect(normalizeFa('مدرسة')).toBe('مدرسه');
  });

  it('removes diacritics, tatweel and invisibles, and turns ZWNJ into a space', () => {
    expect(normalizeFa('پـوشـاك')).toBe('پوشاک');
    expect(normalizeFa('‏لوازم‌خانگی﻿')).toBe('لوازم خانگی');
  });

  it('collapses whitespace, trims and lowercases', () => {
    expect(normalizeFa('  Kids   Wear ')).toBe('kids wear');
  });

  it('converts digits both ways', () => {
    expect(toLatinDigits('۱۲۳٤٥')).toBe('12345');
    expect(toPersianDigits(2026)).toBe('۲۰۲۶');
  });
});
