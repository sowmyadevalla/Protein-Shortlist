// ============================================================
// Domain types — mirror the database schema
// Missing values are null, never treated as zero or a match.
// ============================================================

export interface Brand {
  id: string;
  name: string;
  slug: string;
  country_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  created_at: string;
}

export interface DietaryAttribute {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface Occasion {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  name: string;
  brand_id: string | null;
  category_id: string | null;
  description: string | null;
  image_url: string | null;
  serving_size: string | null;
  serving_size_grams: number | null;
  barcode: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductNutrition {
  product_id: string;
  basis?: 'per_serving' | 'per_100g' | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  calories: number | null;
  sugar_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  source_verified: boolean;
  updated_at: string;
}

export interface Retailer {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website_url: string | null;
  created_at: string;
}

export interface RetailerOffer {
  id: string;
  product_id: string;
  retailer_id: string;
  price_inr: number | null;
  currency: string;
  product_url: string | null;
  in_stock: boolean | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
  retailer?: Retailer | null;
}

export interface DataSource {
  id: string;
  name: string;
  slug: string;
  source_type: string;
  api_base_url: string | null;
  is_enabled: boolean;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ProductSourceLink {
  id: string;
  product_id: string;
  data_source_id: string;
  external_id: string;
  external_url: string | null;
  raw_payload: Record<string, unknown> | null;
  last_synced_at: string;
  created_at: string;
}

export interface IngestionJob {
  id: string;
  data_source_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  records_processed: number;
  records_imported: number;
  records_updated: number;
  error_message: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavedProduct {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface ShoppingCart {
  id: string;
  user_id: string;
  retailer_offer_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Composite types for UI (joined query results)
// ============================================================

export interface ProductWithRelations extends Product {
  brand?: Brand | null;
  category?: Category | null;
  nutrition?: ProductNutrition | null;
  dietary_attributes?: DietaryAttribute[];
  occasions?: Occasion[];
  retailer_offers?: RetailerOffer[];
  source_links?: ProductSourceLink[];
}

export interface RetailerOfferWithRelations extends RetailerOffer {
  retailer?: Retailer;
  product?: Product;
}

export interface ShoppingCartWithRelations extends ShoppingCart {
  retailer_offer?: RetailerOfferWithRelations;
}
