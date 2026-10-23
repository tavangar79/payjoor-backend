import { describe, expect, it } from 'vitest';
import { normalizeHandle } from '../../src/lib/handle.js';

describe('normalizeHandle', () => {
  it('lowercases and strips @, trailing slash and query string', () => {
    expect(normalizeHandle('@MaashMamad')).toBe('maashmamad');
    expect(normalizeHandle('sadegh.delicious/')).toBe('sadegh.delicious');
    expect(normalizeHandle('shop_1?igsh=abc123')).toBe('shop_1');
    expect(normalizeHandle('  @Shop.Name/?utm=x  ')).toBe('shop.name');
  });

  it('rejects invalid handles', () => {
    expect(normalizeHandle('')).toBeNull();
    expect(normalizeHandle('@')).toBeNull();
    expect(normalizeHandle('has space')).toBeNull();
    expect(normalizeHandle('a'.repeat(31))).toBeNull();
    expect(normalizeHandle('پیج')).toBeNull();
    expect(normalizeHandle('instagram.com/foo')).toBeNull();
  });
});
