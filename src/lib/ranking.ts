import type { ProductWithRelations } from './types';
import type { SearchFilters } from './filters';

export interface ProductRankReason {
  label: string;
  detail: string;
  positive: boolean;
}

export interface RankedProduct {
  product: ProductWithRelations;
  score: number;
  reasons: ProductRankReason[];
}

function hasVerifiedPerServingNutrition(product: ProductWithRelations): boolean {
  return product.nutrition?.source_verified === true && product.nutrition.basis === 'per_serving';
}

function matchingQueryTerms(product: ProductWithRelations, query: string): number {
  const terms = query
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 1);
  const searchable = [
    product.name,
    product.brand?.name ?? '',
    product.description ?? '',
    product.category?.name ?? '',
    ...(product.dietary_attributes ?? []).map((attribute) => attribute.name),
    ...(product.occasions ?? []).map((occasion) => occasion.name),
  ].join(' ').toLocaleLowerCase();
  return terms.filter((term) => searchable.includes(term)).length;
}

function newestDataTimestamp(product: ProductWithRelations): number | null {
  const dates = [
    product.updated_at,
    ...(product.retailer_offers ?? []).map((offer) => offer.updated_at),
    ...(product.source_links ?? []).map((source) => source.last_synced_at),
  ]
    .filter(Boolean)
    .map((date) => Date.parse(date))
    .filter((date) => Number.isFinite(date));
  return dates.length > 0 ? Math.max(...dates) : null;
}

function scoreProduct(
  product: ProductWithRelations,
  filters: SearchFilters,
  now: number
): RankedProduct {
  let score = matchingQueryTerms(product, filters.query) * 3;
  const reasons: ProductRankReason[] = [];
  const nutritionIsUsable = hasVerifiedPerServingNutrition(product);
  const protein = nutritionIsUsable ? product.nutrition?.protein_g : null;
  const sugar = nutritionIsUsable ? product.nutrition?.sugar_g : null;
  const dietaryAttributes = product.dietary_attributes ?? [];
  const pricedOffers = (product.retailer_offers ?? []).filter((offer) =>
    offer.currency === 'INR'
    && offer.price_inr != null
    && (filters.maxPriceINR == null
      || (filters.maxPriceExclusive
        ? offer.price_inr < filters.maxPriceINR
        : offer.price_inr <= filters.maxPriceINR))
  );
  const bestPrice = pricedOffers
    .map((offer) => offer.price_inr)
    .filter((price): price is number => price != null)
    .reduce<number | null>(
    (lowest, price) => lowest == null || price < lowest ? price : lowest,
    null
  );

  if (protein != null) {
    score += Math.min(protein, 100) / 2;
    if (filters.minProteinG != null) {
      reasons.push({
        label: 'Protein requirement met',
        detail: `Verified ${protein}g per serving meets your ${filters.minProteinG}g minimum.`,
        positive: true,
      });
    }
    if (filters.preferHighProtein) {
      score += Math.min(protein, 100) / 2;
      reasons.push({
        label: 'Protein used for ranking',
        detail: `Verified ${protein}g per serving is used to prioritize higher-protein options.`,
        positive: true,
      });
    }
  } else if (product.nutrition == null || product.nutrition.protein_g == null) {
    reasons.push({
      label: 'Protein data unavailable',
      detail: 'No protein amount is available to verify for this product.',
      positive: false,
    });
  }
  if (filters.maxSugarG != null && sugar != null) {
    reasons.push({
      label: 'Sugar requirement met',
      detail: `Verified ${sugar}g per serving is within your ${filters.maxSugarG}g limit.`,
      positive: true,
    });
  }
  if (filters.preferLowSugar && sugar != null) {
    score += Math.max(0, 15 - sugar);
    reasons.push({
      label: 'Sugar used for ranking',
      detail: `Verified ${sugar}g per serving is used to prioritize lower-sugar options.`,
      positive: true,
    });
  }

  const matchedDietaryAttributes = dietaryAttributes.filter((attribute) =>
    filters.dietaryAttributeIds.includes(attribute.id)
  );
  if (matchedDietaryAttributes.length === filters.dietaryAttributeIds.length && matchedDietaryAttributes.length > 0) {
    reasons.push({
      label: 'Dietary preference listed',
      detail: matchedDietaryAttributes.map((attribute) => attribute.name).join(', '),
      positive: true,
    });
  }
  if (filters.categoryId && product.category_id === filters.categoryId && product.category) {
    reasons.push({
      label: 'Category match',
      detail: `Listed in ${product.category.name}.`,
      positive: true,
    });
  }

  if (bestPrice != null) {
    score += Math.max(0, 10 - bestPrice / 200);
    if (filters.maxPriceINR != null) {
      reasons.push({
        label: 'Budget requirement met',
        detail: `Listed at ₹${bestPrice}, within your budget.`,
        positive: true,
      });
    }
  }

  const knownFields = [
    Boolean(product.brand?.name),
    Boolean(product.category?.name),
    Boolean(product.image_url),
    nutritionIsUsable && product.nutrition?.protein_g != null,
    bestPrice != null,
    dietaryAttributes.length > 0,
  ].filter(Boolean).length;
  score += knownFields;

  const timestamp = newestDataTimestamp(product);
  if (timestamp != null && timestamp <= now) {
    const ageDays = (now - timestamp) / (24 * 60 * 60 * 1000);
    score += ageDays <= 30 ? 5 : ageDays <= 90 ? 3 : ageDays <= 365 ? 1 : 0;
  }

  return { product, score, reasons };
}

export function rankProduct(
  product: ProductWithRelations,
  filters: SearchFilters,
  now = Date.now()
): RankedProduct {
  return scoreProduct(product, filters, now);
}

export function rankProducts(
  products: ProductWithRelations[],
  filters: SearchFilters,
  now = Date.now()
): RankedProduct[] {
  return products
    .map((product) => scoreProduct(product, filters, now))
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name));
}
