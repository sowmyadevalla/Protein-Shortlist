import { describe, it, expect } from 'vitest';
import { filterProducts, emptyFilters, validateSearchFilters, type SearchFilters } from '@/lib/filters';
import type { ProductWithRelations } from '@/lib/types';

function makeProduct(overrides: Partial<ProductWithRelations> = {}): ProductWithRelations {
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
    nutrition: null,
    dietary_attributes: [],
    occasions: [],
    retailer_offers: [],
    source_links: [],
    ...overrides,
  };
}

describe('filterProducts', () => {
  it('returns all products when no filters are set', () => {
    const products = [makeProduct({ id: 'a' }), makeProduct({ id: 'b' })];
    const result = filterProducts(products, emptyFilters);
    expect(result).toHaveLength(2);
  });

  it('returns empty array for empty catalog', () => {
    const result = filterProducts([], emptyFilters);
    expect(result).toEqual([]);
  });

  it('filters by text query in product name', () => {
    const products = [
      makeProduct({ id: 'a', name: 'Whey Protein' }),
      makeProduct({ id: 'b', name: 'Casein Protein' }),
      makeProduct({ id: 'c', name: 'Vitamin C' }),
    ];
    const filters: SearchFilters = { ...emptyFilters, query: 'protein' };
    expect(filterProducts(products, filters)).toHaveLength(2);
  });

  it('filters by text query in brand name', () => {
    const products = [
      makeProduct({ id: 'a', name: 'Bar', brand: { id: 'b1', name: 'MyProtein', slug: 'myprotein', country_code: null, created_at: '', updated_at: '' } }),
      makeProduct({ id: 'b', name: 'Bar', brand: { id: 'b2', name: 'OtherBrand', slug: 'other', country_code: null, created_at: '', updated_at: '' } }),
    ];
    const filters: SearchFilters = { ...emptyFilters, query: 'myprotein' };
    expect(filterProducts(products, filters)).toHaveLength(1);
    expect(filterProducts(products, filters)[0].id).toBe('a');
  });

  it('applies combined explicit category, dietary, and exclusive budget filters', () => {
    const vegetarianSnacks = makeProduct({
      id: 'under-budget',
      name: 'Roasted chana',
      category_id: 'snacks',
      category: { id: 'snacks', name: 'Snacks', slug: 'snacks', parent_id: null, created_at: '' },
      dietary_attributes: [{ id: 'veg', name: 'Vegetarian', slug: 'vegetarian', description: null }],
      retailer_offers: [{
        id: 'offer-1', product_id: 'under-budget', retailer_id: 'retailer-1',
        price_inr: 75, currency: 'INR', product_url: null, in_stock: null,
        last_checked_at: null, created_at: '', updated_at: '',
      }],
    });
    const overBudget = makeProduct({
      ...vegetarianSnacks,
      id: 'over-budget',
      retailer_offers: [{
        id: 'offer-2', product_id: 'over-budget', retailer_id: 'retailer-1',
        price_inr: 120, currency: 'INR', product_url: null, in_stock: null,
        last_checked_at: null, created_at: '', updated_at: '',
      }],
    });
    const exactLimit = makeProduct({
      ...vegetarianSnacks,
      id: 'at-limit',
      retailer_offers: [{
        id: 'offer-3', product_id: 'at-limit', retailer_id: 'retailer-1',
        price_inr: 100, currency: 'INR', product_url: null, in_stock: null,
        last_checked_at: null, created_at: '', updated_at: '',
      }],
    });

    const filters: SearchFilters = {
      ...emptyFilters,
      categoryId: 'snacks',
      dietaryAttributeIds: ['veg'],
      maxPriceINR: 100,
      maxPriceExclusive: true,
    };
    expect(filterProducts([vegetarianSnacks, exactLimit, overBudget], filters).map((product) => product.id)).toEqual(['under-budget']);
  });

  it('filters minimum protein using verified per-serving values only', () => {
    const breakfast = makeProduct({
      id: 'high-protein',
      category: { id: 'breakfast', name: 'Breakfast', slug: 'breakfast', parent_id: null, created_at: '' },
      nutrition: { product_id: 'high-protein', basis: 'per_serving', protein_g: 12, carbs_g: null, fat_g: null, calories: null, sugar_g: null, fiber_g: null, sodium_mg: null, source_verified: true, updated_at: '' },
      serving_size_grams: 40,
    });
    const lowerProtein = makeProduct({
      ...breakfast,
      id: 'lower-protein',
      nutrition: { ...breakfast.nutrition!, product_id: 'lower-protein', protein_g: 7 },
    });

    const filters: SearchFilters = { ...emptyFilters, minProteinG: 10 };
    expect(filterProducts([breakfast, lowerProtein], filters).map((product) => product.id)).toEqual(['high-protein']);
  });

  it('rejects unverified, per-100g, and unknown-basis nutrition for serving requirements', () => {
    const products = [
      makeProduct({ id: 'verified', nutrition: { product_id: 'verified', basis: 'per_serving', protein_g: 20, carbs_g: null, fat_g: null, calories: null, sugar_g: null, fiber_g: null, sodium_mg: null, source_verified: true, updated_at: '' } }),
      makeProduct({ id: 'unverified', nutrition: { product_id: 'unverified', basis: 'per_serving', protein_g: 30, carbs_g: null, fat_g: null, calories: null, sugar_g: null, fiber_g: null, sodium_mg: null, source_verified: false, updated_at: '' } }),
      makeProduct({ id: 'per-100g', nutrition: { product_id: 'per-100g', basis: 'per_100g', protein_g: 40, carbs_g: null, fat_g: null, calories: null, sugar_g: null, fiber_g: null, sodium_mg: null, source_verified: true, updated_at: '' } }),
      makeProduct({ id: 'unknown', nutrition: { product_id: 'unknown', protein_g: 50, carbs_g: null, fat_g: null, calories: null, sugar_g: null, fiber_g: null, sodium_mg: null, source_verified: true, updated_at: '' } }),
    ];
    expect(filterProducts(products, { ...emptyFilters, minProteinG: 10 }).map((product) => product.id)).toEqual(['verified']);
  });

  it('filters by category ID', () => {
    const products = [
      makeProduct({ id: 'a', category_id: 'cat1' }),
      makeProduct({ id: 'b', category_id: 'cat2' }),
    ];
    const filters: SearchFilters = { ...emptyFilters, categoryId: 'cat1' };
    expect(filterProducts(products, filters)).toHaveLength(1);
    expect(filterProducts(products, filters)[0].id).toBe('a');
  });

  it('filters by brand ID', () => {
    const products = [
      makeProduct({ id: 'a', brand_id: 'br1' }),
      makeProduct({ id: 'b', brand_id: 'br2' }),
    ];
    const filters: SearchFilters = { ...emptyFilters, brandId: 'br1' };
    expect(filterProducts(products, filters)).toHaveLength(1);
  });

  it('filters by minimum protein — excludes products with no nutrition data', () => {
    const products = [
      makeProduct({ id: 'a', nutrition: { product_id: 'a', basis: 'per_serving', protein_g: 25, carbs_g: null, fat_g: null, calories: null, sugar_g: null, fiber_g: null, sodium_mg: null, source_verified: true, updated_at: '' } }),
      makeProduct({ id: 'b', nutrition: { product_id: 'b', protein_g: 5, carbs_g: null, fat_g: null, calories: null, sugar_g: null, fiber_g: null, sodium_mg: null, source_verified: false, updated_at: '' } }),
      makeProduct({ id: 'c', nutrition: null }),
    ];
    const filters: SearchFilters = { ...emptyFilters, minProteinG: 10 };
    const result = filterProducts(products, filters);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('does NOT treat missing protein as zero', () => {
    const products = [
      makeProduct({ id: 'a', nutrition: null }),
    ];
    const filters: SearchFilters = { ...emptyFilters, minProteinG: 0 };
    // Even minProteinG=0 should exclude products with no protein data
    expect(filterProducts(products, filters)).toHaveLength(0);
  });

  it('filters by maximum price — excludes products with no offers', () => {
    const products = [
      makeProduct({ id: 'a', retailer_offers: [{ id: 'o1', product_id: 'a', retailer_id: 'r1', price_inr: 300, currency: 'INR', product_url: null, in_stock: null, last_checked_at: null, created_at: '', updated_at: '' }] }),
      makeProduct({ id: 'b', retailer_offers: [{ id: 'o2', product_id: 'b', retailer_id: 'r1', price_inr: 900, currency: 'INR', product_url: null, in_stock: null, last_checked_at: null, created_at: '', updated_at: '' }] }),
      makeProduct({ id: 'c', retailer_offers: [] }),
    ];
    const filters: SearchFilters = { ...emptyFilters, maxPriceINR: 500 };
    expect(filterProducts(products, filters)).toHaveLength(1);
    expect(filterProducts(products, filters)[0].id).toBe('a');
  });

  it('does NOT treat missing price as zero', () => {
    const products = [
      makeProduct({ id: 'a', retailer_offers: [{ id: 'o1', product_id: 'a', retailer_id: 'r1', price_inr: null, currency: 'INR', product_url: null, in_stock: null, last_checked_at: null, created_at: '', updated_at: '' }] }),
    ];
    const filters: SearchFilters = { ...emptyFilters, maxPriceINR: 500 };
    // Offer has null price — should NOT match
    expect(filterProducts(products, filters)).toHaveLength(0);
  });

  it('respects inclusive and exclusive budget bounds and ignores non-INR offers', () => {
    const product = makeProduct({
      id: 'edge',
      retailer_offers: [
        { id: 'usd', product_id: 'edge', retailer_id: 'r1', price_inr: 1, currency: 'USD', product_url: null, in_stock: null, last_checked_at: null, created_at: '', updated_at: '' },
        { id: 'inr', product_id: 'edge', retailer_id: 'r2', price_inr: 100, currency: 'INR', product_url: null, in_stock: null, last_checked_at: null, created_at: '', updated_at: '' },
      ],
    });
    expect(filterProducts([product], { ...emptyFilters, maxPriceINR: 100 })).toHaveLength(1);
    expect(filterProducts([product], { ...emptyFilters, maxPriceINR: 100, maxPriceExclusive: true })).toHaveLength(0);
  });

  it('reports and removes invalid numeric and oversized query parameters', () => {
    const validation = validateSearchFilters({
      ...emptyFilters,
      query: 'x'.repeat(201),
      minProteinG: -1,
      maxPriceINR: Number.POSITIVE_INFINITY,
    });
    expect(validation.errors).toHaveLength(3);
    expect(validation.filters.minProteinG).toBeNull();
    expect(validation.filters.maxPriceINR).toBeNull();
    expect(validation.filters.query).toHaveLength(200);
  });

  it('filters by dietary attributes — product must have ALL selected', () => {
    const vegetarian = { id: 'd1', name: 'Vegetarian', slug: 'vegetarian', description: null };
    const vegan = { id: 'd2', name: 'Vegan', slug: 'vegan', description: null };

    const products = [
      makeProduct({ id: 'a', dietary_attributes: [vegetarian, vegan] }),
      makeProduct({ id: 'b', dietary_attributes: [vegetarian] }),
      makeProduct({ id: 'c', dietary_attributes: [] }),
    ];
    const filters: SearchFilters = { ...emptyFilters, dietaryAttributeIds: ['d1', 'd2'] };
    expect(filterProducts(products, filters)).toHaveLength(1);
    expect(filterProducts(products, filters)[0].id).toBe('a');
  });

  it('filters by single dietary attribute', () => {
    const vegetarian = { id: 'd1', name: 'Vegetarian', slug: 'vegetarian', description: null };
    const products = [
      makeProduct({ id: 'a', dietary_attributes: [vegetarian] }),
      makeProduct({ id: 'b', dietary_attributes: [] }),
    ];
    const filters: SearchFilters = { ...emptyFilters, dietaryAttributeIds: ['d1'] };
    expect(filterProducts(products, filters)).toHaveLength(1);
  });

  it('filters by occasion', () => {
    const breakfast = { id: 'oc1', name: 'Breakfast', slug: 'breakfast' };
    const products = [
      makeProduct({ id: 'a', occasions: [breakfast] }),
      makeProduct({ id: 'b', occasions: [] }),
    ];
    const filters: SearchFilters = { ...emptyFilters, occasionId: 'oc1' };
    expect(filterProducts(products, filters)).toHaveLength(1);
  });

  it('filters by maximum sugar — excludes products with no sugar data', () => {
    const products = [
      makeProduct({ id: 'a', nutrition: { product_id: 'a', basis: 'per_serving', protein_g: null, carbs_g: null, fat_g: null, calories: null, sugar_g: 3, fiber_g: null, sodium_mg: null, source_verified: true, updated_at: '' } }),
      makeProduct({ id: 'b', nutrition: { product_id: 'b', basis: 'per_serving', protein_g: null, carbs_g: null, fat_g: null, calories: null, sugar_g: 15, fiber_g: null, sodium_mg: null, source_verified: true, updated_at: '' } }),
      makeProduct({ id: 'c', nutrition: null }),
    ];
    const filters: SearchFilters = { ...emptyFilters, maxSugarG: 5 };
    expect(filterProducts(products, filters)).toHaveLength(1);
    expect(filterProducts(products, filters)[0].id).toBe('a');
  });

  it('filters by maximum calories — excludes products with no calorie data', () => {
    const products = [
      makeProduct({ id: 'a', nutrition: { product_id: 'a', basis: 'per_serving', protein_g: null, carbs_g: null, fat_g: null, calories: 150, sugar_g: null, fiber_g: null, sodium_mg: null, source_verified: true, updated_at: '' } }),
      makeProduct({ id: 'b', nutrition: { product_id: 'b', basis: 'per_serving', protein_g: null, carbs_g: null, fat_g: null, calories: 400, sugar_g: null, fiber_g: null, sodium_mg: null, source_verified: true, updated_at: '' } }),
      makeProduct({ id: 'c', nutrition: null }),
    ];
    const filters: SearchFilters = { ...emptyFilters, maxCalories: 200 };
    expect(filterProducts(products, filters)).toHaveLength(1);
    expect(filterProducts(products, filters)[0].id).toBe('a');
  });

  it('combines multiple filters (AND logic)', () => {
    const products = [
      makeProduct({
        id: 'a',
        category_id: 'cat1',
        nutrition: { product_id: 'a', basis: 'per_serving', protein_g: 20, carbs_g: null, fat_g: null, calories: null, sugar_g: 2, fiber_g: null, sodium_mg: null, source_verified: true, updated_at: '' },
        retailer_offers: [{ id: 'o1', product_id: 'a', retailer_id: 'r1', price_inr: 250, currency: 'INR', product_url: null, in_stock: null, last_checked_at: null, created_at: '', updated_at: '' }],
      }),
      makeProduct({
        id: 'b',
        category_id: 'cat1',
        nutrition: { product_id: 'b', basis: 'per_serving', protein_g: 20, carbs_g: null, fat_g: null, calories: null, sugar_g: 20, fiber_g: null, sodium_mg: null, source_verified: true, updated_at: '' },
        retailer_offers: [{ id: 'o2', product_id: 'b', retailer_id: 'r1', price_inr: 250, currency: 'INR', product_url: null, in_stock: null, last_checked_at: null, created_at: '', updated_at: '' }],
      }),
      makeProduct({
        id: 'c',
        category_id: 'cat2',
        nutrition: { product_id: 'c', basis: 'per_serving', protein_g: 20, carbs_g: null, fat_g: null, calories: null, sugar_g: 2, fiber_g: null, sodium_mg: null, source_verified: true, updated_at: '' },
        retailer_offers: [{ id: 'o3', product_id: 'c', retailer_id: 'r1', price_inr: 250, currency: 'INR', product_url: null, in_stock: null, last_checked_at: null, created_at: '', updated_at: '' }],
      }),
    ];
    const filters: SearchFilters = {
      ...emptyFilters,
      categoryId: 'cat1',
      minProteinG: 15,
      maxPriceINR: 500,
      maxSugarG: 5,
    };
    const result = filterProducts(products, filters);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });
});
