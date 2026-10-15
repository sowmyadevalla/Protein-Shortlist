import type { Brand, Category, DietaryAttribute, Occasion } from '@/lib/types';
import { validateSearchFilters, type SearchFilters, type SearchFilterValidation } from '@/lib/filters';

export interface SearchReferences {
  categories: Category[];
  brands: Brand[];
  dietaryAttributes: DietaryAttribute[];
  occasions: Occasion[];
}

export interface ParsedSearch {
  filters: Partial<SearchFilters>;
  remainingQuery: string;
  recognized: string[];
  notes: string[];
}

export function resolveSearchFilters(
  filters: SearchFilters,
  parsedSearch: ParsedSearch
): SearchFilterValidation {
  const dietaryAttributeIds = [
    ...new Set([
      ...filters.dietaryAttributeIds,
      ...(parsedSearch.filters.dietaryAttributeIds ?? []),
    ]),
  ];
  return validateSearchFilters({
    ...filters,
    ...parsedSearch.filters,
    dietaryAttributeIds,
    query: parsedSearch.remainingQuery,
  });
}

const QUERY_LIMIT = 200;
const MAX_PRICE_INR = 10_000_000;
const MAX_NUTRITION_GRAMS = 500;
const ignoredWords = new Set([
  'a', 'an', 'and', 'for', 'i', 'me', 'my', 'of', 'some', 'the', 'to',
  'want', 'with', 'options', 'option', 'products', 'product', 'please',
  'find', 'show', 'get', 'compare',
]);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function phrasePattern(phrase: string): RegExp | null {
  const normalized = phrase.toLowerCase().replace(/[-_]+/g, ' ').trim();
  if (!normalized) return null;
  const words = normalized.split(/\s+/).map(escapeRegex);
  return new RegExp(`(^|[^a-z0-9])(${words.join('[\\s-]+')})(?=$|[^a-z0-9])`, 'i');
}

function removePhrase(text: string, phrase: string): { text: string; found: boolean } {
  const pattern = phrasePattern(phrase);
  if (!pattern) return { text, found: false };
  const next = text.replace(pattern, (_match, prefix: string) => `${prefix} `);
  return { text: next, found: next !== text };
}

function findReference<T extends { id: string; name: string; slug: string }>(
  text: string,
  references: T[],
  aliases: Record<string, string[]> = {}
): { text: string; value: T | null; ambiguous: boolean } {
  const matches = references
    .map((reference) => ({
      reference,
      phrases: [...new Set([
        reference.name,
        reference.slug,
        ...(aliases[reference.id] ?? []),
      ])].sort((a, b) => b.length - a.length),
    }))
    .flatMap(({ reference, phrases }) =>
      phrases.some((phrase) => phrasePattern(phrase)?.test(text))
        ? [reference]
        : []
    );

  if (matches.length !== 1) {
    return { text, value: null, ambiguous: matches.length > 1 };
  }

  let remaining = text;
  const reference = matches[0];
  const phrases = [
    reference.name,
    reference.slug,
    ...(aliases[reference.id] ?? []),
  ].sort((a, b) => b.length - a.length);
  for (const phrase of phrases) {
    const removed = removePhrase(remaining, phrase);
    if (removed.found) {
      remaining = removed.text;
      break;
    }
  }
  return { text: remaining, value: reference, ambiguous: false };
}

function categoryAliases(category: Category): string[] {
  const normalized = `${category.name} ${category.slug.replace(/[-_]/g, ' ')}`.toLowerCase();
  if (/\bsnack/.test(normalized)) return ['snack', 'snacks'];
  if (/\bbreakfast\b/.test(normalized)) return ['breakfast'];
  if (/\bpowder/.test(normalized)) return ['protein powder', 'protein powders', 'powder', 'powders'];
  if (/\bdairy\b/.test(normalized)) return ['dairy', 'dairy alternative', 'dairy alternatives'];
  return [];
}

function dietaryAliases(attribute: DietaryAttribute): string[] {
  const normalized = `${attribute.name} ${attribute.slug.replace(/[-_]/g, ' ')}`.toLowerCase();
  const groups: [RegExp, string[]][] = [
    [/\bvegetarian\b/, ['vegetarian', 'veggie']],
    [/\bvegan\b/, ['vegan', 'plant based', 'plant-based']],
    [/\bgluten[- ]free\b/, ['gluten free', 'gluten-free']],
    [/\bdairy[- ]free\b/, ['dairy free', 'dairy-free', 'lactose free', 'lactose-free']],
    [/\bno added sugar\b/, ['no added sugar', 'sugar free', 'sugar-free']],
    [/\bhalal\b/, ['halal']],
    [/\bkosher\b/, ['kosher']],
  ];
  return groups.find(([pattern]) => pattern.test(normalized))?.[1] ?? [];
}

function occasionAliases(occasion: Occasion): string[] {
  const normalized = `${occasion.name} ${occasion.slug.replace(/[-_]/g, ' ')}`.toLowerCase();
  if (/post[\s-]*workout|post[\s-]*workout/.test(normalized)) {
    return ['post workout', 'post-workout', 'after workout', 'post exercise'];
  }
  if (/\bbreakfast\b/.test(normalized)) return ['breakfast'];
  if (/\bsnack/.test(normalized)) return ['snack', 'snacks'];
  if (/on[\s-]*the[\s-]*go/.test(normalized)) return ['on the go', 'on-the-go'];
  return [];
}

function takeNumber(
  text: string,
  pattern: RegExp,
  notes: string[],
  label: string,
  maximum: number,
  amountGroup = 2,
  exclusiveGroup = 1
): { text: string; amount: number | null; exclusive: boolean; found: boolean } {
  const match = pattern.exec(text);
  if (!match) return { text, amount: null, exclusive: false, found: false };

  const number = Number(match[amountGroup].replace(/,/g, ''));
  if (!Number.isFinite(number) || number < 0 || number > maximum) {
    notes.push(`The ${label} value is outside the supported range and was not applied.`);
    return {
      text: `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`,
      amount: null,
      exclusive: false,
      found: true,
    };
  }

  return {
    text: `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`,
    amount: number,
    exclusive: /^(under|below|less than)$/i.test(match[exclusiveGroup] ?? ''),
    found: true,
  };
}

export function parseSearchQuery(query: string, references: SearchReferences): ParsedSearch {
  const notes: string[] = [];
  const recognized: string[] = [];
  if (query.length > QUERY_LIMIT) {
    notes.push(`Search text is limited to ${QUERY_LIMIT} characters; the remaining text was ignored.`);
  }
  let text = query.slice(0, QUERY_LIMIT);
  const filters: Partial<SearchFilters> = {};

  const price = takeNumber(
    text,
    /\b(under|below|up to|upto|less than|at most|max(?:imum)?)\s*(?:₹|rs\.?\s*|inr\s*)?([\d,]+)\b(?!\s*(?:g\b|grams?\b))/i,
    notes,
    'price',
    MAX_PRICE_INR
  );
  if (price.found) {
    text = price.text;
    if (price.amount != null) {
      filters.maxPriceINR = price.amount;
      filters.maxPriceExclusive = price.exclusive;
      recognized.push(`${price.exclusive ? 'Under' : 'Up to'} ₹${price.amount.toLocaleString('en-IN')}`);
    }
  }

  const protein = takeNumber(
    text,
    /\b(?:with\s+)?(?:at least|minimum|min(?:imum)?)\s*([\d,]+(?:\.\d+)?)\s*g(?:\s+of)?(?:\s+protein)?(?:\s+per serving)?\b/i,
    notes,
    'protein',
    MAX_NUTRITION_GRAMS,
    1,
    0
  );
  if (protein.found) {
    text = protein.text;
    if (protein.amount != null) {
      filters.minProteinG = protein.amount;
      recognized.push(`At least ${protein.amount}g protein per serving`);
    }
  } else {
    const reversedProtein = takeNumber(
      text,
      /\bprotein\s+(?:at least|minimum|min(?:imum)?)\s*([\d,]+(?:\.\d+)?)\s*g(?:\s+per serving)?\b/i,
      notes,
      'protein',
      MAX_NUTRITION_GRAMS,
      1,
      0
    );
    if (reversedProtein.found) {
      text = reversedProtein.text;
      if (reversedProtein.amount != null) {
        filters.minProteinG = reversedProtein.amount;
        recognized.push(`At least ${reversedProtein.amount}g protein per serving`);
      }
    }
  }

  const sugar = takeNumber(
    text,
    /\b(under|below|up to|upto|less than|at most|max(?:imum)?)\s*([\d,]+(?:\.\d+)?)\s*g(?:\s+of)?\s+sugar(?:\s+per serving)?\b/i,
    notes,
    'sugar',
    MAX_NUTRITION_GRAMS
  );
  if (sugar.found) {
    text = sugar.text;
    if (sugar.amount != null) {
      filters.maxSugarG = sugar.amount;
      filters.maxSugarExclusive = sugar.exclusive;
      recognized.push(`${sugar.exclusive ? 'Under' : 'Up to'} ${sugar.amount}g sugar per serving`);
    }
  }

  const highProtein = removePhrase(text, 'high protein');
  if (highProtein.found) {
    text = highProtein.text;
    filters.preferHighProtein = true;
    recognized.push('Prioritize higher protein');
  }
  const lowSugar = removePhrase(text, 'low sugar');
  if (lowSugar.found) {
    text = lowSugar.text;
    filters.preferLowSugar = true;
    recognized.push('Prioritize lower sugar');
  }

  const categories = references.categories.map((category) => ({
    ...category,
    slug: category.slug,
  }));
  const categoryResult = findReference(
    text,
    categories,
    Object.fromEntries(categories.map((category) => [category.id, categoryAliases(category)]))
  );
  if (categoryResult.ambiguous) {
    notes.push('More than one catalog category matches this query. Choose a category filter to narrow it down.');
  } else if (categoryResult.value) {
    text = categoryResult.text;
    filters.categoryId = categoryResult.value.id;
    recognized.push(`Category: ${categoryResult.value.name}`);
  }

  const dietaryResult = findReference(
    text,
    references.dietaryAttributes,
    Object.fromEntries(references.dietaryAttributes.map((attribute) => [attribute.id, dietaryAliases(attribute)]))
  );
  if (dietaryResult.ambiguous) {
    notes.push('More than one dietary attribute matches this query. Choose dietary filters to clarify.');
  } else if (dietaryResult.value) {
    text = dietaryResult.text;
    filters.dietaryAttributeIds = [dietaryResult.value.id];
    recognized.push(`Diet: ${dietaryResult.value.name}`);
  }

  const occasionResult = findReference(
    text,
    references.occasions,
    Object.fromEntries(references.occasions.map((occasion) => [occasion.id, occasionAliases(occasion)]))
  );
  if (occasionResult.ambiguous) {
    notes.push('More than one occasion matches this query. Choose an occasion filter to clarify.');
  } else if (occasionResult.value) {
    text = occasionResult.text;
    filters.occasionId = occasionResult.value.id;
    recognized.push(`Occasion: ${occasionResult.value.name}`);
  }

  const brandResult = findReference(text, references.brands);
  if (brandResult.ambiguous) {
    notes.push('More than one brand matches this query. Choose a brand filter to clarify.');
  } else if (brandResult.value) {
    text = brandResult.text;
    filters.brandId = brandResult.value.id;
    recognized.push(`Brand: ${brandResult.value.name}`);
  }

  if (/\b(?:high[\s-]*protein|protein-rich)\b/i.test(text)) {
    notes.push('Protein per serving could not be inferred from this phrase. Results are ranked by available protein data; set a minimum in filters for a strict requirement.');
  }
  if (/\b(?:low[\s-]*sugar|sugar-conscious)\b/i.test(text)) {
    notes.push('No numeric sugar limit was specified. Results are ranked by available sugar data; set a maximum in filters for a strict requirement.');
  }

  text = text
    .replace(/\b(?:a|an|and|for|i|me|my|of|some|the|to|want|with|options?|products?|please|find|show|get|compare|protein)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((term) => term && !ignoredWords.has(term.toLowerCase()))
    .join(' ');

  return { filters, remainingQuery: text, recognized, notes };
}
