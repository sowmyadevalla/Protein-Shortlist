-- Keep nutrition values comparable only when their measurement basis is known.
ALTER TABLE product_nutrition
  ADD COLUMN IF NOT EXISTS basis text
  CHECK (basis IN ('per_serving', 'per_100g'));

COMMENT ON COLUMN product_nutrition.basis IS
  'Measurement basis for stored nutrition values. NULL means legacy data has no known basis.';
