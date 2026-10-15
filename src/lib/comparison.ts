import type { ProductWithRelations } from './types';

export interface ParsedComparisonIds {
  ids: string[];
  invalid: boolean;
}

export function parseComparisonProductIds(value: string): ParsedComparisonIds {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const values = value.split(',').map((id) => id.trim()).filter(Boolean);
  if (values.some((id) => !uuidPattern.test(id))) return { ids: [], invalid: true };
  return { ids: [...new Set(values)].slice(0, 4), invalid: false };
}

export function getNutritionBasisLabel(product: ProductWithRelations): string {
  if (product.nutrition?.basis === 'per_serving') return 'Per serving';
  if (product.nutrition?.basis === 'per_100g') return 'Per 100g';
  return 'Basis unknown';
}

export function getComparableProteinMaximum(products: ProductWithRelations[]): number | null {
  if (products.length < 2) return null;
  const basis = products[0].nutrition?.basis;
  if (!basis || products.some((product) =>
    product.nutrition?.source_verified !== true
    || product.nutrition.basis !== basis
    || product.nutrition.protein_g == null
  )) {
    return null;
  }

  return products.reduce((maximum, product) =>
    Math.max(maximum, product.nutrition?.protein_g ?? 0), 0);
}

export function getNutritionValueStatus(
  product: ProductWithRelations,
  value: number | null
): string {
  if (value == null) return 'Not available';
  if (product.nutrition?.source_verified !== true) return 'Unverified value';
  if (!product.nutrition.basis) return 'Measurement basis unknown';
  return '';
}
