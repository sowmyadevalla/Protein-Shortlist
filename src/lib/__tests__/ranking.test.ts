import { describe, expect, it } from 'vitest';
import { rankProducts, rankProduct } from '@/lib/ranking';
import { emptyFilters, type SearchFilters } from '@/lib/filters';
import type { ProductWithRelations, ProductNutrition } from '@/lib/types';

function makeProduct(
  overrides: Partial<ProductWithRelations> = {},
  nutrition: Partial<ProductNutrition> | null = null
): ProductWithRelations {
  return {
    id: 'p1',
    name: 'Test Product',
    brand_id: null,
    category_id: null,
    description: null,
    image_url: null,
    serving_size: null,
    serving_size_grams: null,
    barcode: null,
    created_at: '',
    updated_at: '',
    brand: null,
    category: null,
    nutrition: nutrition
      ? {
          product_id: 'p1',
          basis: null,
          protein_g: null,
          carbs_g: null,
          fat_g: null,
          calories: null,
          sugar_g: null,
          fiber_g: null,
          sodium_mg: null,
          source_verified: false,
          updated_at: '',
          ...nutrition,
        }
      : null,
    dietary_attributes: [],
    occasions: [],
    retailer_offers: [],
    source_links: [],
    ...overrides,
  };
}

describe('product ranking', () => {
  it('returns empty array for empty catalog', () => {
    expect(rankProducts([], emptyFilters)).toEqual([]);
  });

  it('ranks verified per-serving protein using its actual quantity', () => {
    const low = makeProduct({ id: 'low', name: 'Low Protein' }, {
      product_id: 'low', basis: 'per_serving', protein_g: 5, source_verified: true,
    });
    const high = makeProduct({ id: 'high', name: 'High Protein' }, {
      product_id: 'high', basis: 'per_serving', protein_g: 25, source_verified: true,
    });
    expect(rankProducts([low, high], emptyFilters)[0].product.id).toBe('high');
  });

  it('does not rank unverified or unknown-basis protein as verified nutrition', () => {
    const unknown = makeProduct({ id: 'unknown', name: 'Unknown basis' }, {
      product_id: 'unknown', protein_g: 50, source_verified: true,
    });
    const verified = makeProduct({ id: 'verified', name: 'Verified basis' }, {
      product_id: 'verified', basis: 'per_serving', protein_g: 10, source_verified: true,
    });
    expect(rankProducts([unknown, verified], emptyFilters)[0].product.id).toBe('verified');
  });

  it('gives a completeness preference using only fields that exist', () => {
    const complete = makeProduct({
      id: 'complete',
      brand: { id: 'b1', name: 'Brand', slug: 'brand', country_code: null, created_at: '', updated_at: '' },
      category: { id: 'c1', name: 'Cat', slug: 'cat', parent_id: null, created_at: '' },
      image_url: 'https://example.test/image.jpg',
      retailer_offers: [{ id: 'o1', product_id: 'complete', retailer_id: 'r1', price_inr: 200, currency: 'INR', product_url: null, in_stock: null, last_checked_at: null, created_at: '', updated_at: '' }],
      dietary_attributes: [{ id: 'veg', name: 'Vegetarian', slug: 'vegetarian', description: null }],
    }, {
      product_id: 'complete', basis: 'per_serving', protein_g: 10, source_verified: true,
    });
    const empty = makeProduct({ id: 'empty' });
    expect(rankProducts([empty, complete], emptyFilters)[0].product.id).toBe('complete');
  });

  it('uses fresh product and source timestamps as a ranking signal', () => {
    const now = Date.parse('2026-01-01T00:00:00Z');
    const fresh = makeProduct({ id: 'fresh', updated_at: '2025-12-20T00:00:00Z' });
    const stale = makeProduct({ id: 'stale', updated_at: '2024-01-01T00:00:00Z' });
    expect(rankProducts([stale, fresh], emptyFilters, now)[0].product.id).toBe('fresh');
  });

  it('explains only actual explicit matches', () => {
    const product = makeProduct({
      id: 'match',
      category_id: 'snacks',
      category: { id: 'snacks', name: 'Snacks', slug: 'snacks', parent_id: null, created_at: '' },
      dietary_attributes: [{ id: 'veg', name: 'Vegetarian', slug: 'vegetarian', description: null }],
      retailer_offers: [{ id: 'o1', product_id: 'match', retailer_id: 'r1', price_inr: 75, currency: 'INR', product_url: null, in_stock: null, last_checked_at: null, created_at: '', updated_at: '' }],
    }, {
      product_id: 'match', basis: 'per_serving', protein_g: 20, sugar_g: 3, source_verified: true,
    });
    const filters: SearchFilters = {
      ...emptyFilters,
      minProteinG: 15,
      maxPriceINR: 100,
      maxPriceExclusive: true,
      maxSugarG: 5,
      dietaryAttributeIds: ['veg'],
      categoryId: 'snacks',
    };
    const reasons = rankProduct(product, filters).reasons.map((reason) => reason.label);
    expect(reasons).toContain('Protein requirement met');
    expect(reasons).toContain('Budget requirement met');
    expect(reasons).toContain('Sugar requirement met');
    expect(reasons).toContain('Dietary preference listed');
    expect(reasons).toContain('Category match');
  });

  it('does not explain unsupported data as a match', () => {
    const product = makeProduct({ id: 'missing' });
    const ranked = rankProduct(product, { ...emptyFilters, minProteinG: 10, maxPriceINR: 500 });
    expect(ranked.reasons.map((reason) => reason.label)).toContain('Protein data unavailable');
    expect(ranked.reasons.some((reason) => reason.label === 'Budget requirement met')).toBe(false);
    expect(ranked.reasons.some((reason) => reason.label === 'Protein requirement met')).toBe(false);
  });

  it('uses deterministic lexical order for equal scores', () => {
    const products = [
      makeProduct({ id: 'z', name: 'Zeta Protein' }),
      makeProduct({ id: 'a', name: 'Alpha Protein' }),
    ];
    expect(rankProducts(products, emptyFilters).map((item) => item.product.id)).toEqual(['a', 'z']);
  });
});
