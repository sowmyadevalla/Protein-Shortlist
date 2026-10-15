import { describe, it, expect } from 'vitest';
import { formatINR, formatGrams, formatNumber, isValidRetailerUrl, slugify } from '@/lib/format';

describe('formatINR', () => {
  it('formats a valid price in Indian rupees', () => {
    const result = formatINR(599);
    expect(result).toContain('599');
  });

  it('returns dash for null', () => {
    expect(formatINR(null)).toBe('—');
  });

  it('returns dash for undefined', () => {
    expect(formatINR(undefined)).toBe('—');
  });
});

describe('formatGrams', () => {
  it('formats a value with grams suffix', () => {
    expect(formatGrams(25)).toBe('25g');
  });

  it('returns dash for null', () => {
    expect(formatGrams(null)).toBe('—');
  });

  it('uses custom suffix when provided', () => {
    expect(formatGrams(100, 'mg')).toBe('100mg');
  });
});

describe('formatNumber', () => {
  it('formats a number with default 0 decimals', () => {
    expect(formatNumber(150)).toBe('150');
  });

  it('formats with specified decimals', () => {
    expect(formatNumber(25.567, 1)).toBe('25.6');
  });

  it('returns dash for null', () => {
    expect(formatNumber(null)).toBe('—');
  });
});

describe('isValidRetailerUrl', () => {
  it('accepts absolute HTTP retailer destinations', () => {
    expect(isValidRetailerUrl('https://shop.example/products/protein')).toBe(true);
    expect(isValidRetailerUrl('http://shop.example/products/protein')).toBe(true);
  });

  it('rejects empty, relative, and non-web destinations', () => {
    expect(isValidRetailerUrl(null)).toBe(false);
    expect(isValidRetailerUrl('/products/protein')).toBe(false);
    expect(isValidRetailerUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('slugify', () => {
  it('converts text to slug format', () => {
    expect(slugify('Whey Protein')).toBe('whey-protein');
  });

  it('handles special characters', () => {
    expect(slugify('MyProtein! @India')).toBe('myprotein-india');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });
});
