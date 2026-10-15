import { getSupabaseClient } from '@/lib/supabase';
import type {
  ProductWithRelations,
  Category,
  Brand,
  DietaryAttribute,
  Occasion,
  Retailer,
  DataSource,
  IngestionJob,
  ShoppingCartWithRelations,
} from '@/lib/types';

// ============================================================
// Data Access Layer
//
// All database queries go through here. Each function returns
// typed data and handles errors explicitly. Missing values are
// preserved as null — never coerced to zero.
// ============================================================

export async function fetchProducts(): Promise<ProductWithRelations[]> {
  const { data, error } = await getSupabaseClient()
    .from('products')
    .select(`
      *,
      brand:brands(*),
      category:categories(*),
      nutrition:product_nutrition(*),
      dietary_attributes:product_dietary_attributes(
        dietary_attribute:dietary_attributes(*)
      ),
      occasions:product_occasions(
        occasion:occasions(*)
      ),
      retailer_offers:retailer_offers(*, retailer:retailers(*)),
      source_links:product_source_links(*)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(transformProduct);
}

export async function fetchProduct(id: string): Promise<ProductWithRelations | null> {
  const { data, error } = await getSupabaseClient()
    .from('products')
    .select(`
      *,
      brand:brands(*),
      category:categories(*),
      nutrition:product_nutrition(*),
      dietary_attributes:product_dietary_attributes(
        dietary_attribute:dietary_attributes(*)
      ),
      occasions:product_occasions(
        occasion:occasions(*)
      ),
      retailer_offers:retailer_offers(*, retailer:retailers(*)),
      source_links:product_source_links(*)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return transformProduct(data);
}

export async function fetchProductsByIds(ids: string[]): Promise<ProductWithRelations[]> {
  if (ids.length === 0) return [];
  const { data, error } = await getSupabaseClient()
    .from('products')
    .select(`
      *,
      brand:brands(*),
      category:categories(*),
      nutrition:product_nutrition(*),
      dietary_attributes:product_dietary_attributes(
        dietary_attribute:dietary_attributes(*)
      ),
      occasions:product_occasions(
        occasion:occasions(*)
      ),
      retailer_offers:retailer_offers(*, retailer:retailers(*)),
      source_links:product_source_links(*)
    `)
    .in('id', ids);

  if (error) throw error;
  return (data ?? []).map(transformProduct);
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await getSupabaseClient().from('categories').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchBrands(): Promise<Brand[]> {
  const { data, error } = await getSupabaseClient().from('brands').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchDietaryAttributes(): Promise<DietaryAttribute[]> {
  const { data, error } = await getSupabaseClient().from('dietary_attributes').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchOccasions(): Promise<Occasion[]> {
  const { data, error } = await getSupabaseClient().from('occasions').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchRetailers(): Promise<Retailer[]> {
  const { data, error } = await getSupabaseClient().from('retailers').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchDataSources(): Promise<DataSource[]> {
  const { data, error } = await getSupabaseClient().from('data_sources').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchIngestionJobs(): Promise<IngestionJob[]> {
  const { data, error } = await getSupabaseClient()
    .from('ingestion_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function fetchSavedProductIds(userId: string): Promise<string[]> {
  const { data, error } = await getSupabaseClient()
    .from('saved_products')
    .select('product_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.product_id);
}

export async function fetchCartItems(userId: string): Promise<ShoppingCartWithRelations[]> {
  const { data, error } = await getSupabaseClient()
    .from('shopping_carts')
    .select(`
      *,
      retailer_offer:retailer_offers(
        *,
        retailer:retailers(*),
        product:products(*)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ShoppingCartWithRelations[];
}

// ============================================================
// Transform: flatten Supabase nested join results into our
// ProductWithRelations shape.
// ============================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformProduct(raw: any): ProductWithRelations {
  return {
    ...raw,
    brand: raw.brand ?? null,
    category: raw.category ?? null,
    nutrition: Array.isArray(raw.nutrition) ? raw.nutrition[0] ?? null : raw.nutrition ?? null,
    dietary_attributes: (raw.dietary_attributes ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((d: any) => d.dietary_attribute)
      .filter(Boolean),
    occasions: (raw.occasions ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((o: any) => o.occasion)
      .filter(Boolean),
    retailer_offers: raw.retailer_offers ?? [],
    source_links: raw.source_links ?? [],
  };
}
