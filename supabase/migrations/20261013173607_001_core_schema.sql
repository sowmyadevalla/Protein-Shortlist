/*
# Protein Shortlist — Core Database Schema

## Overview
Creates the complete normalized data architecture for a protein-product discovery
and shopping platform for India. The schema supports products, brands, categories,
nutrition, dietary attributes, retailers, retailer offers, product-source links,
data sources, ingestion jobs, users, saved products, and shopping carts.

## Design Principles
- Real data only: no fake products seeded. Empty catalog is valid.
- Canonical product can have multiple retailer offers (one-to-many).
- External identifiers and source provenance tracked for every imported record.
- Missing fields are NULL — never treated as zero or as a successful match.
- Normalized: brands, categories, retailers, data sources are separate tables.

## New Tables

### Reference Data
1. `brands` — Product manufacturers/brand names
2. `categories` — Product classification (protein powder, snacks, breakfast, etc.)
3. `dietary_attributes` — Dietary tags (vegetarian, vegan, gluten-free, etc.)
4. `occasions` — Usage occasions (breakfast, post-workout, snack, on-the-go)

### Product Data
5. `products` — Canonical product records (1:many with retailer offers)
6. `product_nutrition` — Per-serving nutrition facts (1:1 with products)
7. `product_dietary_attributes` — M2M: products <-> dietary_attributes
8. `product_occasions` — M2M: products <-> occasions

### Commerce
9. `retailers` — Indian retailers (Amazon India, Flipkart, BigBasket, etc.)
10. `retailer_offers` — A specific retailer's offer for a product

### Data Pipeline / Provenance
11. `data_sources` — External data feed sources (Open Food Facts, affiliate feeds, etc.)
12. `product_source_links` — Provenance: which source provided which product/field
13. `ingestion_jobs` — Track ingestion job runs from data sources

### User Data
14. `profiles` — User profile data (linked to auth.users), includes is_admin flag
15. `saved_products` — User's shortlisted products
16. `shopping_carts` — User's basket items

## Security
- RLS enabled on every table.
- Public catalog tables: readable by anon + authenticated (public browsing).
  Writes restricted to authenticated admins via is_admin() SECURITY DEFINER function.
- User-scoped tables (saved_products, shopping_carts, profiles): owner-scoped CRUD.
- Auto-create profile on signup via trigger.
*/

-- ============================================================
-- REFERENCE DATA TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  country_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS dietary_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text
);
ALTER TABLE dietary_attributes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS occasions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL
);
ALTER TABLE occasions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PRODUCT TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand_id uuid REFERENCES brands(id) ON DELETE SET NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  description text,
  image_url text,
  serving_size text,
  serving_size_grams numeric,
  barcode text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

CREATE TABLE IF NOT EXISTS product_nutrition (
  product_id uuid PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  calories numeric,
  sugar_g numeric,
  fiber_g numeric,
  sodium_mg numeric,
  source_verified boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE product_nutrition ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS product_dietary_attributes (
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  dietary_attribute_id uuid REFERENCES dietary_attributes(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, dietary_attribute_id)
);
ALTER TABLE product_dietary_attributes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS product_occasions (
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  occasion_id uuid REFERENCES occasions(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, occasion_id)
);
ALTER TABLE product_occasions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- COMMERCE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS retailers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  website_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE retailers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS retailer_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  retailer_id uuid NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  price_inr numeric,
  currency text NOT NULL DEFAULT 'INR',
  product_url text,
  in_stock boolean,
  last_checked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE retailer_offers ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_offers_product ON retailer_offers(product_id);
CREATE INDEX IF NOT EXISTS idx_offers_retailer ON retailer_offers(retailer_id);

-- ============================================================
-- DATA PIPELINE / PROVENANCE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  source_type text NOT NULL,
  api_base_url text,
  is_enabled boolean NOT NULL DEFAULT false,
  config jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS product_source_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  data_source_id uuid NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  external_url text,
  raw_payload jsonb,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, data_source_id)
);
ALTER TABLE product_source_links ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_psl_source ON product_source_links(data_source_id);
CREATE INDEX IF NOT EXISTS idx_psl_external ON product_source_links(external_id);

CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id uuid NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  records_processed int NOT NULL DEFAULT 0,
  records_imported int NOT NULL DEFAULT 0,
  records_updated int NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ingestion_source ON ingestion_jobs(data_source_id);

-- ============================================================
-- USER DATA TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS saved_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);
ALTER TABLE saved_products ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS shopping_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  retailer_offer_id uuid NOT NULL REFERENCES retailer_offers(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, retailer_offer_id)
);
ALTER TABLE shopping_carts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: is_admin() function (must come after profiles table)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin(check_uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = check_uid),
    false
  );
$$;

-- ============================================================
-- TRIGGER: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- POLICIES: PUBLIC CATALOG TABLES (read by anon, admin-only writes)
-- ============================================================

-- Brands
DROP POLICY IF EXISTS "read_brands" ON brands;
CREATE POLICY "read_brands" ON brands FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_write_brands" ON brands;
CREATE POLICY "admin_write_brands" ON brands FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_update_brands" ON brands;
CREATE POLICY "admin_update_brands" ON brands FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_delete_brands" ON brands;
CREATE POLICY "admin_delete_brands" ON brands FOR DELETE TO authenticated USING (public.is_admin());

-- Categories
DROP POLICY IF EXISTS "read_categories" ON categories;
CREATE POLICY "read_categories" ON categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_write_categories" ON categories;
CREATE POLICY "admin_write_categories" ON categories FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_update_categories" ON categories;
CREATE POLICY "admin_update_categories" ON categories FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_delete_categories" ON categories;
CREATE POLICY "admin_delete_categories" ON categories FOR DELETE TO authenticated USING (public.is_admin());

-- Dietary Attributes
DROP POLICY IF EXISTS "read_dietary_attributes" ON dietary_attributes;
CREATE POLICY "read_dietary_attributes" ON dietary_attributes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_write_dietary" ON dietary_attributes;
CREATE POLICY "admin_write_dietary" ON dietary_attributes FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_update_dietary" ON dietary_attributes;
CREATE POLICY "admin_update_dietary" ON dietary_attributes FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_delete_dietary" ON dietary_attributes;
CREATE POLICY "admin_delete_dietary" ON dietary_attributes FOR DELETE TO authenticated USING (public.is_admin());

-- Occasions
DROP POLICY IF EXISTS "read_occasions" ON occasions;
CREATE POLICY "read_occasions" ON occasions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_write_occasions" ON occasions;
CREATE POLICY "admin_write_occasions" ON occasions FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_update_occasions" ON occasions;
CREATE POLICY "admin_update_occasions" ON occasions FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_delete_occasions" ON occasions;
CREATE POLICY "admin_delete_occasions" ON occasions FOR DELETE TO authenticated USING (public.is_admin());

-- Products
DROP POLICY IF EXISTS "read_products" ON products;
CREATE POLICY "read_products" ON products FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_write_products" ON products;
CREATE POLICY "admin_write_products" ON products FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_update_products" ON products;
CREATE POLICY "admin_update_products" ON products FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_delete_products" ON products;
CREATE POLICY "admin_delete_products" ON products FOR DELETE TO authenticated USING (public.is_admin());

-- Product Nutrition
DROP POLICY IF EXISTS "read_product_nutrition" ON product_nutrition;
CREATE POLICY "read_product_nutrition" ON product_nutrition FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_write_nutrition" ON product_nutrition;
CREATE POLICY "admin_write_nutrition" ON product_nutrition FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_update_nutrition" ON product_nutrition;
CREATE POLICY "admin_update_nutrition" ON product_nutrition FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_delete_nutrition" ON product_nutrition;
CREATE POLICY "admin_delete_nutrition" ON product_nutrition FOR DELETE TO authenticated USING (public.is_admin());

-- Product Dietary Attributes (junction)
DROP POLICY IF EXISTS "read_product_dietary" ON product_dietary_attributes;
CREATE POLICY "read_product_dietary" ON product_dietary_attributes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_write_product_dietary" ON product_dietary_attributes;
CREATE POLICY "admin_write_product_dietary" ON product_dietary_attributes FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_delete_product_dietary" ON product_dietary_attributes;
CREATE POLICY "admin_delete_product_dietary" ON product_dietary_attributes FOR DELETE TO authenticated USING (public.is_admin());

-- Product Occasions (junction)
DROP POLICY IF EXISTS "read_product_occasions" ON product_occasions;
CREATE POLICY "read_product_occasions" ON product_occasions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_write_product_occasions" ON product_occasions;
CREATE POLICY "admin_write_product_occasions" ON product_occasions FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_delete_product_occasions" ON product_occasions;
CREATE POLICY "admin_delete_product_occasions" ON product_occasions FOR DELETE TO authenticated USING (public.is_admin());

-- Retailers
DROP POLICY IF EXISTS "read_retailers" ON retailers;
CREATE POLICY "read_retailers" ON retailers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_write_retailers" ON retailers;
CREATE POLICY "admin_write_retailers" ON retailers FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_update_retailers" ON retailers;
CREATE POLICY "admin_update_retailers" ON retailers FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_delete_retailers" ON retailers;
CREATE POLICY "admin_delete_retailers" ON retailers FOR DELETE TO authenticated USING (public.is_admin());

-- Retailer Offers
DROP POLICY IF EXISTS "read_offers" ON retailer_offers;
CREATE POLICY "read_offers" ON retailer_offers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_write_offers" ON retailer_offers;
CREATE POLICY "admin_write_offers" ON retailer_offers FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_update_offers" ON retailer_offers;
CREATE POLICY "admin_update_offers" ON retailer_offers FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_delete_offers" ON retailer_offers;
CREATE POLICY "admin_delete_offers" ON retailer_offers FOR DELETE TO authenticated USING (public.is_admin());

-- Data Sources
DROP POLICY IF EXISTS "read_data_sources" ON data_sources;
CREATE POLICY "read_data_sources" ON data_sources FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_write_data_sources" ON data_sources;
CREATE POLICY "admin_write_data_sources" ON data_sources FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_update_data_sources" ON data_sources;
CREATE POLICY "admin_update_data_sources" ON data_sources FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_delete_data_sources" ON data_sources;
CREATE POLICY "admin_delete_data_sources" ON data_sources FOR DELETE TO authenticated USING (public.is_admin());

-- Product Source Links
DROP POLICY IF EXISTS "read_psl" ON product_source_links;
CREATE POLICY "read_psl" ON product_source_links FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_write_psl" ON product_source_links;
CREATE POLICY "admin_write_psl" ON product_source_links FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_update_psl" ON product_source_links;
CREATE POLICY "admin_update_psl" ON product_source_links FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_delete_psl" ON product_source_links;
CREATE POLICY "admin_delete_psl" ON product_source_links FOR DELETE TO authenticated USING (public.is_admin());

-- Ingestion Jobs
DROP POLICY IF EXISTS "read_ingestion" ON ingestion_jobs;
CREATE POLICY "read_ingestion" ON ingestion_jobs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_write_ingestion" ON ingestion_jobs;
CREATE POLICY "admin_write_ingestion" ON ingestion_jobs FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_update_ingestion" ON ingestion_jobs;
CREATE POLICY "admin_update_ingestion" ON ingestion_jobs FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_delete_ingestion" ON ingestion_jobs;
CREATE POLICY "admin_delete_ingestion" ON ingestion_jobs FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- POLICIES: USER-SCOPED TABLES
-- ============================================================

-- Profiles: user reads/updates own profile; admin can read all and update
DROP POLICY IF EXISTS "read_own_profile" ON profiles;
CREATE POLICY "read_own_profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_admin());
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;
CREATE POLICY "admin_update_profiles" ON profiles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Saved Products: owner-scoped CRUD
DROP POLICY IF EXISTS "select_own_saved" ON saved_products;
CREATE POLICY "select_own_saved" ON saved_products FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_saved" ON saved_products;
CREATE POLICY "insert_own_saved" ON saved_products FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_saved" ON saved_products;
CREATE POLICY "delete_own_saved" ON saved_products FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Shopping Carts: owner-scoped CRUD
DROP POLICY IF EXISTS "select_own_cart" ON shopping_carts;
CREATE POLICY "select_own_cart" ON shopping_carts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_cart" ON shopping_carts;
CREATE POLICY "insert_own_cart" ON shopping_carts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_cart" ON shopping_carts;
CREATE POLICY "update_own_cart" ON shopping_carts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_cart" ON shopping_carts;
CREATE POLICY "delete_own_cart" ON shopping_carts FOR DELETE TO authenticated USING (auth.uid() = user_id);