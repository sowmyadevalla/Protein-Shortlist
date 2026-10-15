import { describe, expect, it } from 'vitest';
import { parseSearchQuery, resolveSearchFilters } from '@/lib/search-parser';
import type { SearchReferences } from '@/lib/search-parser';
import { emptyFilters } from '@/lib/filters';

const references: SearchReferences = {
  categories: [
    { id: 'snacks', name: 'Snacks', slug: 'snacks', parent_id: null, created_at: '' },
    { id: 'breakfast', name: 'Breakfast', slug: 'breakfast', parent_id: null, created_at: '' },
    { id: 'powder', name: 'Protein Powders', slug: 'protein-powders', parent_id: null, created_at: '' },
  ],
  brands: [
    { id: 'brand-a', name: 'Acme Foods', slug: 'acme-foods', country_code: 'IN', created_at: '', updated_at: '' },
  ],
  dietaryAttributes: [
    { id: 'vegetarian', name: 'Vegetarian', slug: 'vegetarian', description: null },
    { id: 'vegan', name: 'Vegan', slug: 'vegan', description: null },
  ],
  occasions: [
    { id: 'post-workout', name: 'Post-workout', slug: 'post-workout' },
  ],
};

describe('parseSearchQuery', () => {
  it('parses the supported natural-language example into explicit filters', () => {
    const parsed = parseSearchQuery(
      'Vegetarian protein snacks under ₹100 with at least 15g protein',
      references
    );

    expect(parsed.filters).toMatchObject({
      maxPriceINR: 100,
      maxPriceExclusive: true,
      minProteinG: 15,
      categoryId: 'snacks',
      dietaryAttributeIds: ['vegetarian'],
    });
    expect(parsed.remainingQuery).toBe('');
    expect(parsed.recognized).toHaveLength(4);
  });

  it('parses powder budget, brand, occasion and low-sugar limit', () => {
    const parsed = parseSearchQuery(
      'Acme Foods protein powder under ₹2,000 post-workout under 5g sugar',
      references
    );

    expect(parsed.filters).toMatchObject({
      maxPriceINR: 2000,
      maxPriceExclusive: true,
      maxSugarG: 5,
      maxSugarExclusive: true,
      categoryId: 'powder',
      brandId: 'brand-a',
      occasionId: 'post-workout',
    });
    expect(parsed.remainingQuery).toBe('');
  });

  it('keeps unsupported phrases as keyword search instead of assuming a filter', () => {
    const parsed = parseSearchQuery('suitable for my marathon training', references);
    expect(parsed.filters).toEqual({});
    expect(parsed.remainingQuery).toBe('suitable marathon training');
  });

  it('reports ambiguous taxonomy phrases without selecting an arbitrary value', () => {
    const ambiguousReferences = {
      ...references,
      dietaryAttributes: [
        ...references.dietaryAttributes,
        { id: 'vegetarian-2', name: 'Vegetarian option', slug: 'vegetarian-option', description: null },
      ],
    };
    const parsed = parseSearchQuery('vegetarian snacks', ambiguousReferences);
    expect(parsed.filters.categoryId).toBe('snacks');
    expect(parsed.filters.dietaryAttributeIds).toBeUndefined();
    expect(parsed.notes).toContain('More than one dietary attribute matches this query. Choose dietary filters to clarify.');
  });

  it('merges interpreted terms with existing user-selected filters', () => {
    const parsed = parseSearchQuery('vegetarian snacks under ₹100', references);
    const resolved = resolveSearchFilters({
      ...emptyFilters,
      minProteinG: 12,
      dietaryAttributeIds: ['vegan'],
    }, parsed);
    expect(resolved.filters).toMatchObject({
      categoryId: 'snacks',
      minProteinG: 12,
      maxPriceINR: 100,
      dietaryAttributeIds: ['vegan', 'vegetarian'],
    });
    expect(resolved.errors).toEqual([]);
  });

  it('rejects unsupported numeric limits and caps query length', () => {
    const tooLarge = parseSearchQuery('under ₹999999999 protein', references);
    expect(tooLarge.filters.maxPriceINR).toBeUndefined();
    expect(tooLarge.notes.some((note) => note.includes('outside the supported range'))).toBe(true);

    const tooLong = parseSearchQuery('a'.repeat(220), references);
    expect(tooLong.notes.some((note) => note.includes('limited to 200 characters'))).toBe(true);
  });
});
