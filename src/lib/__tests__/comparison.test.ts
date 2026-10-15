import { describe, expect, it } from 'vitest';
import { getComparableProteinMaximum, getNutritionBasisLabel, getNutritionValueStatus, parseComparisonProductIds } from '@/lib/comparison';
import type { ProductWithRelations } from '@/lib/types';

function product(
  id: string,
  basis: 'per_serving' | 'per_100g' | null,
  protein: number | null,
  source_verified: boolean
): ProductWithRelations {
  return {
    id,
    name: id,
    brand_id: null,
    category_id: null,
    description: null,
    image_url: null,
    serving_size: null,
    serving_size_grams: null,
    barcode: null,
    created_at: '',
    updated_at: '',
    nutrition: {
      product_id: id,
      basis,
      protein_g: protein,
      carbs_g: null,
      fat_g: null,
      calories: null,
      sugar_g: null,
      fiber_g: null,
      sodium_mg: null,
      source_verified,
      updated_at: '',
    },
    dietary_attributes: [],
    occasions: [],
    retailer_offers: [],
    source_links: [],
  };
}

describe('product comparison nutrition', () => {
  it('sanitizes comparison IDs, removes duplicates, and caps requests at four products', () => {
    const ids = [
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333',
      '44444444-4444-4444-4444-444444444444',
      '55555555-5555-5555-5555-555555555555',
    ];
    expect(parseComparisonProductIds(`${ids[0]},${ids[0]},${ids.slice(1).join(',')}`)).toEqual({
      ids: ids.slice(0, 4),
      invalid: false,
    });
    expect(parseComparisonProductIds(`${ids[0]},bad-id`)).toEqual({ ids: [], invalid: true });
  });

  it('marks a missing measurement basis as unknown', () => {
    expect(getNutritionBasisLabel(product('a', null, 10, true))).toBe('Basis unknown');
  });

  it('only identifies a highest protein value when all compared values are verified and comparable', () => {
    const first = product('a', 'per_serving', 15, true);
    const second = product('b', 'per_serving', 20, true);
    expect(getComparableProteinMaximum([first, second])).toBe(20);
    expect(getComparableProteinMaximum([first, product('c', 'per_100g', 30, true)])).toBeNull();
    expect(getComparableProteinMaximum([first, product('c', 'per_serving', 30, false)])).toBeNull();
    expect(getComparableProteinMaximum([first, product('c', 'per_serving', null, true)])).toBeNull();
  });

  it('labels unavailable and unverified values instead of showing them as verified', () => {
    expect(getNutritionValueStatus(product('a', 'per_serving', null, true), null)).toBe('Not available');
    expect(getNutritionValueStatus(product('b', 'per_serving', 10, false), 10)).toBe('Unverified value');
    expect(getNutritionValueStatus(product('c', null, 10, true), 10)).toBe('Measurement basis unknown');
  });
});
