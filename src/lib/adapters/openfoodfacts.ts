import type { DataSourceAdapter, AdapterProductRecord, AdapterSearchResult, SearchOptions } from '@/lib/adapters/types';
import { slugify } from '@/lib/format';

// ============================================================
// Open Food Facts Adapter
//
// Implements the DataSourceAdapter interface against the
// Open Food Facts public API (v3).
//
// IMPORTANT — Open Food Facts API requirements:
//
// 1. USER-AGENT: Must send a descriptive User-Agent header
//    identifying the app and contact, e.g.:
//    "ProteinShortlist/1.0 (contact@proteinshortlist.in)"
//
// 2. RATE LIMITS: The API enforces rate limits. Per the docs:
//    - If requests come from users directly (e.g. mobile app),
//      rate limits apply per user.
//    - For server-side batch requests, use the MongoDB export
//      or request fields selectively to reduce response size.
//    - Honor 429 responses with backoff.
//
// 3. LICENSING: Data is under the Open Database License (ODbL).
//    Individual contents under Database Contents License (DbCL).
//    Product images under Creative Commons Attribution ShareAlike.
//    Attribution is required when redistributing the data.
//
// 4. ATTRIBUTION: Must attribute Open Food Facts as data source.
//
// 5. API VERSION: v3 is recommended (latest: v3.6). v2 is deprecated.
//    Base URL: https://world.openfoodfacts.org/api/v3
//
// 6. DOES NOT PROVIDE: Indian retailer prices, checkout, stock,
//    or delivery information. This adapter fetches product +
//    nutrition data only. Retailer offers must come from
//    authorized affiliate feeds or merchant APIs.
//
// This adapter is designed to be called from an Edge Function
// (server-side) so that the User-Agent and any rate limiting
// are managed centrally, not from the browser.
// ============================================================

const OFF_API_BASE = 'https://world.openfoodfacts.org/api/v3';
const OFF_SEARCH_BASE = 'https://world.openfoodfacts.org/api/v3/search';
const OFF_USER_AGENT = 'ProteinShortlist/1.0 (contact@proteinshortlist.in) — https://proteinshortlist.in';

// Fields we request to minimize response size (per OFF best practices)
const PRODUCT_FIELDS = [
  'code',
  'product_name',
  'brands',
  'categories',
  'image_front_small_url',
  'image_url',
  'serving_size',
  'serving_quantity',
  'nutriments',
  'labels',
  'countries',
  'quantity',
  'url',
  'ingredients_text',
].join(',');

interface OFFNutriments {
  'proteins_100g'?: number;
  'carbohydrates_100g'?: number;
  'fat_100g'?: number;
  'energy-kcal_100g'?: number;
  'sugars_100g'?: number;
  'fiber_100g'?: number;
  'sodium_100g'?: number;
  'proteins_serving'?: number;
  'carbohydrates_serving'?: number;
  'fat_serving'?: number;
  'energy-kcal_serving'?: number;
  'sugars_serving'?: number;
  'fiber_serving'?: number;
  'sodium_serving'?: number;
}

interface OFFProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  categories?: string;
  image_front_small_url?: string;
  image_url?: string;
  serving_size?: string;
  serving_quantity?: number;
  nutriments?: OFFNutriments;
  labels?: string;
  countries?: string;
  url?: string;
  ingredients_text?: string;
}

function parseNutriments(n: OFFNutriments | undefined, servingGrams: number | null): AdapterProductRecord['nutrition'] {
  if (!n) return null;

  // Use per-serving values if available, otherwise calculate from per-100g
  const useServing = servingGrams != null && servingGrams > 0;

  const protein = useServing
    ? n['proteins_serving'] ?? (n['proteins_100g'] != null ? (n['proteins_100g'] * servingGrams) / 100 : null)
    : n['proteins_100g'] ?? null;
  const carbs = useServing
    ? n['carbohydrates_serving'] ?? (n['carbohydrates_100g'] != null ? (n['carbohydrates_100g'] * servingGrams) / 100 : null)
    : n['carbohydrates_100g'] ?? null;
  const fat = useServing
    ? n['fat_serving'] ?? (n['fat_100g'] != null ? (n['fat_100g'] * servingGrams) / 100 : null)
    : n['fat_100g'] ?? null;
  const calories = useServing
    ? n['energy-kcal_serving'] ?? (n['energy-kcal_100g'] != null ? (n['energy-kcal_100g'] * servingGrams) / 100 : null)
    : n['energy-kcal_100g'] ?? null;
  const sugar = useServing
    ? n['sugars_serving'] ?? (n['sugars_100g'] != null ? (n['sugars_100g'] * servingGrams) / 100 : null)
    : n['sugars_100g'] ?? null;
  const fiber = useServing
    ? n['fiber_serving'] ?? (n['fiber_100g'] != null ? (n['fiber_100g'] * servingGrams) / 100 : null)
    : n['fiber_100g'] ?? null;
  const sodium = useServing
    ? n['sodium_serving'] ?? (n['sodium_100g'] != null ? (n['sodium_100g'] * servingGrams) / 100 : null)
    : n['sodium_100g'] ?? null;

  return {
    basis: useServing ? 'per_serving' : 'per_100g',
    proteinG: protein != null ? Math.round(protein * 10) / 10 : null,
    carbsG: carbs != null ? Math.round(carbs * 10) / 10 : null,
    fatG: fat != null ? Math.round(fat * 10) / 10 : null,
    calories: calories != null ? Math.round(calories) : null,
    sugarG: sugar != null ? Math.round(sugar * 10) / 10 : null,
    fiberG: fiber != null ? Math.round(fiber * 10) / 10 : null,
    sodiumMg: sodium != null ? Math.round(sodium * 1000) : null, // OFF provides grams, we store mg
    sourceVerified: false,
  };
}

function parseDietaryLabels(labels: string | undefined): string[] {
  if (!labels) return [];
  // Extract relevant dietary labels
  const labelList = labels.split(',').map((l) => l.trim()).filter(Boolean);
  const dietaryKeywords = [
    'vegetarian', 'vegan', 'gluten-free', 'gluten free',
    'no added sugar', 'organic', 'lactose-free', 'lactose free',
    'dairy-free', 'dairy free', 'kosher', 'halal',
  ];
  return labelList.filter((label) =>
    dietaryKeywords.some((kw) => label.toLowerCase().includes(kw))
  );
}

function transformOFFProduct(p: OFFProduct): AdapterProductRecord | null {
  if (!p.code || !p.product_name) return null;

  const servingGrams = p.serving_quantity != null ? p.serving_quantity : null;

  return {
    name: p.product_name,
    barcode: p.code,
    brandName: p.brands?.split(',')[0]?.trim() ?? null,
    categoryName: p.categories?.split(',')[0]?.trim() ?? null,
    description: p.ingredients_text ?? null,
    imageUrl: p.image_front_small_url ?? p.image_url ?? null,
    servingSize: p.serving_size ?? null,
    servingSizeGrams: servingGrams,
    nutrition: parseNutriments(p.nutriments, servingGrams),
    dietaryAttributeNames: parseDietaryLabels(p.labels),
    externalId: p.code,
    externalUrl: p.url ?? `https://world.openfoodfacts.org/product/${p.code}`,
    rawPayload: p as unknown as Record<string, unknown>,
  };
}

export class OpenFoodFactsAdapter implements DataSourceAdapter {
  readonly slug = 'open-food-facts';
  readonly name = 'Open Food Facts';

  isConfigured(): boolean {
    // OFF is a free public API — always available for reads.
    // In production, this should check if the data_sources row is enabled.
    return true;
  }

  async searchProducts(query: string, options: SearchOptions): Promise<AdapterSearchResult> {
    if (!this.isConfigured()) {
      return { records: [], totalAvailable: 0, hasMore: false, nextPageCursor: null };
    }

    const params = new URLSearchParams({
      search_terms: query,
      fields: PRODUCT_FIELDS,
      page_size: String(Math.min(options.pageSize, 50)),
    });

    if (options.pageCursor) {
      params.set('page_number', options.pageCursor);
    }

    if (options.countryCode) {
      params.set('countries_tags', options.countryCode);
    }

    if (options.tags && options.tags.length > 0) {
      params.set('tags', options.tags.join(','));
    }

    const url = `${OFF_SEARCH_BASE}?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': OFF_USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Open Food Facts rate limit reached. Please retry with backoff.');
      }
      throw new Error(`OFF API returned ${response.status}`);
    }

    const data = await response.json();
    const products: OFFProduct[] = data.products ?? [];
    const records = products
      .map(transformOFFProduct)
      .filter((r): r is AdapterProductRecord => r !== null);

    const currentPage = parseInt(options.pageCursor ?? '1');
    const totalPages = data.page_count ?? 1;
    const hasMore = currentPage < totalPages;

    return {
      records,
      totalAvailable: data.count ?? null,
      hasMore,
      nextPageCursor: hasMore ? String(currentPage + 1) : null,
    };
  }

  async getProductByExternalId(externalId: string): Promise<AdapterProductRecord | null> {
    if (!this.isConfigured()) return null;

    const url = `${OFF_API_BASE}/product/${externalId}?fields=${PRODUCT_FIELDS}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': OFF_USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`OFF API returned ${response.status}`);
    }

    const data = await response.json();
    const product: OFFProduct | null = data.product ?? null;
    if (!product) return null;

    return transformOFFProduct(product);
  }

  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      const response = await fetch(`${OFF_API_BASE}/product/3017620422003?fields=code`, {
        headers: { 'User-Agent': OFF_USER_AGENT },
      });
      if (response.ok) {
        return { healthy: true, message: 'Open Food Facts API reachable' };
      }
      return { healthy: false, message: `API returned ${response.status}` };
    } catch (err) {
      return { healthy: false, message: `Connection failed: ${(err as Error).message}` };
    }
  }
}

// ============================================================
// Affiliate Feed Adapter (STUB — not configured)
//
// Interface for authorized affiliate feed integrations.
// This would connect to affiliate networks like:
// - Amazon Associates Product Advertising API
// - Flipkart Affiliate API
// - Other authorized merchant feeds
//
// DISABLED until API keys and affiliate agreements are in place.
// Never scrape retailer websites or use undocumented APIs.
// ============================================================

export class AffiliateFeedAdapter implements DataSourceAdapter {
  readonly slug: string;
  readonly name: string;
  private apiKey: string | null = null;
  private apiBaseUrl: string | null = null;

  constructor(slug: string, name: string) {
    this.slug = slug;
    this.name = name;
  }

  configure(apiKey: string, apiBaseUrl: string): void {
    this.apiKey = apiKey;
    this.apiBaseUrl = apiBaseUrl;
  }

  isConfigured(): boolean {
    return this.apiKey !== null && this.apiBaseUrl !== null;
  }

  async searchProducts(_query: string, _options: SearchOptions): Promise<AdapterSearchResult> {
    if (!this.isConfigured()) {
      throw new Error(`${this.name} is not configured. Add API credentials to enable this data source.`);
    }
    // Implementation would call the affiliate API here.
    // Each feed has its own authentication, response format, and rate limits.
    throw new Error(`${this.name} adapter not yet implemented. Configure API credentials first.`);
  }

  async getProductByExternalId(_externalId: string): Promise<AdapterProductRecord | null> {
    if (!this.isConfigured()) {
      throw new Error(`${this.name} is not configured.`);
    }
    throw new Error(`${this.name} adapter not yet implemented.`);
  }

  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { healthy: false, message: `${this.name} is not configured — disabled.` };
    }
    return { healthy: false, message: `${this.name} adapter implementation pending.` };
  }
}

// ============================================================
// Brand Catalog Adapter (STUB — not configured)
//
// Interface for direct brand catalog feeds.
// Brands can provide authorized product + nutrition data.
// DISABLED until agreements are in place.
// ============================================================

export class BrandCatalogAdapter implements DataSourceAdapter {
  readonly slug: string;
  readonly name: string;
  private feedUrl: string | null = null;
  private apiKey: string | null = null;

  constructor(slug: string, name: string) {
    this.slug = slug;
    this.name = name;
  }

  configure(feedUrl: string, apiKey?: string): void {
    this.feedUrl = feedUrl;
    if (apiKey) this.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return this.feedUrl !== null;
  }

  async searchProducts(_query: string, _options: SearchOptions): Promise<AdapterSearchResult> {
    if (!this.isConfigured()) {
      throw new Error(`${this.name} is not configured. Add feed URL to enable.`);
    }
    throw new Error(`${this.name} adapter not yet implemented.`);
  }

  async getProductByExternalId(_externalId: string): Promise<AdapterProductRecord | null> {
    if (!this.isConfigured()) {
      throw new Error(`${this.name} is not configured.`);
    }
    throw new Error(`${this.name} adapter not yet implemented.`);
  }

  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { healthy: false, message: `${this.name} is not configured — disabled.` };
    }
    return { healthy: false, message: `${this.name} adapter implementation pending.` };
  }
}

// ============================================================
// Register adapters (OFF enabled, stubs disabled)
// ============================================================
import { registerAdapter } from '@/lib/adapters/types';

const offAdapter = new OpenFoodFactsAdapter();
registerAdapter(offAdapter, true);

// Pre-register disabled adapter stubs for known sources
registerAdapter(new AffiliateFeedAdapter('amazon-india-affiliate', 'Amazon India Affiliate'), false);
registerAdapter(new AffiliateFeedAdapter('flipkart-affiliate', 'Flipkart Affiliate'), false);
registerAdapter(new BrandCatalogAdapter('myprotein-brand-catalog', 'MyProtein Brand Catalog'), false);
registerAdapter(new BrandCatalogAdapter('optimum-nutrition-brand-catalog', 'Optimum Nutrition Brand Catalog'), false);

export { offAdapter };
