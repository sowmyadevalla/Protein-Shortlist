import type { Product, ProductNutrition, DietaryAttribute } from '@/lib/types';

// ============================================================
// Adapter Interfaces
//
// These interfaces define contracts for data sources that feed
// product and nutrition data into Protein Shortlist.
//
// Each adapter is responsible for:
// 1. Fetching data from an external source (API, feed, catalog)
// 2. Transforming it into our canonical product/nutrition shape
// 3. Tracking the external identifier for deduplication / provenance
//
// Adapters do NOT write to the database directly — the ingestion
// service calls the adapter, receives normalized records, and
// handles persistence + deduplication.
// ============================================================

export interface AdapterProductRecord {
  // Canonical product fields (nullable where data may be absent)
  name: string;
  barcode: string | null;
  brandName: string | null;
  categoryName: string | null;
  description: string | null;
  imageUrl: string | null;
  servingSize: string | null;
  servingSizeGrams: number | null;
  // Nutrition per serving (null where unavailable — NEVER zero)
  nutrition: {
    basis: 'per_serving' | 'per_100g';
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
    calories: number | null;
    sugarG: number | null;
    fiberG: number | null;
    sodiumMg: number | null;
    sourceVerified: boolean;
  } | null;
  // Dietary attribute names (slugified by ingestion service)
  dietaryAttributeNames: string[];
  // External source tracking
  externalId: string;
  externalUrl: string | null;
  rawPayload: Record<string, unknown>;
}

export interface AdapterSearchResult {
  records: AdapterProductRecord[];
  totalAvailable: number | null;
  hasMore: boolean;
  nextPageCursor: string | null;
}

export interface DataSourceAdapter {
  // Unique slug matching the data_sources table
  readonly slug: string;

  // Human-readable name
  readonly name: string;

  // Whether this adapter is ready to use (configured + enabled)
  isConfigured(): boolean;

  // Search for products matching a query (natural language or structured)
  searchProducts(query: string, options: SearchOptions): Promise<AdapterSearchResult>;

  // Fetch a single product by its external ID (e.g., barcode)
  getProductByExternalId(externalId: string): Promise<AdapterProductRecord | null>;

  // Health check — can we reach the source?
  healthCheck(): Promise<{ healthy: boolean; message: string }>;
}

export interface SearchOptions {
  pageSize: number;
  pageCursor: string | null;
  // Optional: restrict to products with these tags/categories
  tags?: string[];
  // Optional: restrict to products sold in a specific country
  countryCode?: string;
}

// ============================================================
// Adapter Registry
//
// Registered adapters are available to the ingestion service.
// Disabled/unconfigured adapters are listed but not invoked.
// ============================================================

export interface RegisteredAdapter {
  adapter: DataSourceAdapter;
  enabled: boolean;
}

const adapterRegistry = new Map<string, RegisteredAdapter>();

export function registerAdapter(adapter: DataSourceAdapter, enabled: boolean): void {
  adapterRegistry.set(adapter.slug, { adapter, enabled });
}

export function getRegisteredAdapters(): RegisteredAdapter[] {
  return Array.from(adapterRegistry.values());
}

export function getAdapter(slug: string): RegisteredAdapter | undefined {
  return adapterRegistry.get(slug);
}

export function isAdapterEnabled(slug: string): boolean {
  return adapterRegistry.get(slug)?.enabled ?? false;
}
