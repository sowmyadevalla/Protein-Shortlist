import type { ProductWithRelations } from '@/lib/types';

// ============================================================
// Search Filters — mandatory user constraints must be respected.
// Missing values must NOT be treated as zero or as a successful match.
// ============================================================

export interface SearchFilters {
  query: string;
  categoryId: string | null;
  brandId: string | null;
  minProteinG: number | null;
  maxPriceINR: number | null;
  maxPriceExclusive: boolean;
  dietaryAttributeIds: string[];
  occasionId: string | null;
  maxSugarG: number | null;
  maxSugarExclusive: boolean;
  maxCalories: number | null;
  preferHighProtein: boolean;
  preferLowSugar: boolean;
}

export const emptyFilters: SearchFilters = {
  query: '',
  categoryId: null,
  brandId: null,
  minProteinG: null,
  maxPriceINR: null,
  maxPriceExclusive: false,
  dietaryAttributeIds: [],
  occasionId: null,
  maxSugarG: null,
  maxSugarExclusive: false,
  maxCalories: null,
  preferHighProtein: false,
  preferLowSugar: false,
};

export interface SearchFilterValidation {
  filters: SearchFilters;
  errors: string[];
}

export function validateSearchFilters(filters: SearchFilters): SearchFilterValidation {
  const sanitized = { ...filters };
  const errors: string[] = [];
  const validateNumber = (
    value: number | null,
    label: string,
    maximum: number
  ): number | null => {
    if (value == null) return null;
    if (!Number.isFinite(value) || value < 0 || value > maximum) {
      errors.push(`${label} must be between 0 and ${maximum}.`);
      return null;
    }
    return value;
  };

  sanitized.query = typeof filters.query === 'string' ? filters.query.trim().slice(0, 200) : '';
  if (typeof filters.query !== 'string' || filters.query.length > 200) errors.push('Search text must be 200 characters or fewer.');
  sanitized.categoryId = typeof filters.categoryId === 'string' ? filters.categoryId.trim().slice(0, 128) || null : null;
  sanitized.brandId = typeof filters.brandId === 'string' ? filters.brandId.trim().slice(0, 128) || null : null;
  sanitized.occasionId = typeof filters.occasionId === 'string' ? filters.occasionId.trim().slice(0, 128) || null : null;
  sanitized.dietaryAttributeIds = [...new Set(
    (Array.isArray(filters.dietaryAttributeIds) ? filters.dietaryAttributeIds : [])
      .filter((id) => typeof id === 'string')
      .map((id) => id.trim().slice(0, 128))
      .filter(Boolean)
  )].slice(0, 30);
  sanitized.minProteinG = validateNumber(filters.minProteinG, 'Minimum protein per serving', 500);
  sanitized.maxPriceINR = validateNumber(filters.maxPriceINR, 'Maximum price', 10_000_000);
  sanitized.maxSugarG = validateNumber(filters.maxSugarG, 'Maximum sugar per serving', 500);
  sanitized.maxSugarExclusive = Boolean(filters.maxSugarExclusive);
  sanitized.maxCalories = validateNumber(filters.maxCalories, 'Maximum calories per serving', 10_000);
  sanitized.maxPriceExclusive = Boolean(filters.maxPriceExclusive);
  sanitized.preferHighProtein = Boolean(filters.preferHighProtein);
  sanitized.preferLowSugar = Boolean(filters.preferLowSugar);

  return { filters: sanitized, errors };
}

// Check a single product against a single filter constraint.
// Returns true if the product PASSES the constraint (should be included).
// Returns false if the product FAILS the constraint (should be excluded).
// Missing values never pass a constraint that requires a value.
export function passesFilter(product: ProductWithRelations, filters: SearchFilters): boolean {
  if (filters.query.trim()) {
    const terms = filters.query
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const searchableText = [
      product.name,
      product.brand?.name,
      product.description,
      product.category?.name,
      ...(product.dietary_attributes ?? []).map((attribute) => attribute.name),
      ...(product.occasions ?? []).map((occasion) => occasion.name),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ');

    if (!terms.every((term) => searchableText.includes(term))) return false;
  }

  // Category filter
  if (filters.categoryId && product.category_id !== filters.categoryId) {
    return false;
  }

  // Brand filter
  if (filters.brandId && product.brand_id !== filters.brandId) {
    return false;
  }

  // Minimum protein: product must HAVE a protein value >= threshold
  // Missing protein does NOT pass (not treated as zero)
  if (filters.minProteinG != null) {
    const protein = product.nutrition?.protein_g;
    if (
      protein == null
      || product.nutrition?.basis !== 'per_serving'
      || !product.nutrition.source_verified
      || protein < filters.minProteinG
    ) {
      return false;
    }
  }

  // Maximum price: at least one retailer offer must have price <= threshold
  // Missing prices do NOT count as matching
  if (filters.maxPriceINR != null) {
    const offers = product.retailer_offers ?? [];
    const hasValidPrice = offers.some((offer) =>
      offer.currency === 'INR'
      && offer.price_inr != null
      && (filters.maxPriceExclusive
        ? offer.price_inr < filters.maxPriceINR!
        : offer.price_inr <= filters.maxPriceINR!)
    );
    if (!hasValidPrice) return false;
  }

  // Dietary attributes: product must have ALL selected attributes
  if (filters.dietaryAttributeIds.length > 0) {
    const productDietaryIds = (product.dietary_attributes ?? []).map((d) => d.id);
    const hasAll = filters.dietaryAttributeIds.every((id) => productDietaryIds.includes(id));
    if (!hasAll) return false;
  }

  // Occasion filter
  if (filters.occasionId) {
    const occasionIds = (product.occasions ?? []).map((o) => o.id);
    if (!occasionIds.includes(filters.occasionId)) return false;
  }

  // Maximum sugar: product must HAVE a sugar value <= threshold
  if (filters.maxSugarG != null) {
    const sugar = product.nutrition?.sugar_g;
    if (sugar == null || product.nutrition?.basis !== 'per_serving'
      || !product.nutrition.source_verified || sugar > filters.maxSugarG
      || (filters.maxSugarExclusive && sugar === filters.maxSugarG)) {
      return false;
    }
  }

  // Maximum calories: product must HAVE a calories value <= threshold
  if (filters.maxCalories != null) {
    const calories = product.nutrition?.calories;
    if (
      calories == null
      || product.nutrition?.basis !== 'per_serving'
      || !product.nutrition.source_verified
      || calories > filters.maxCalories
    ) {
      return false;
    }
  }

  return true;
}

export function filterProducts(products: ProductWithRelations[], filters: SearchFilters): ProductWithRelations[] {
  const { filters: validFilters } = validateSearchFilters(filters);
  return products.filter((product) => passesFilter(product, validFilters));
}
