# Protein Shortlist

Protein Shortlist helps people discover and compare protein products by budget, diet, nutrition, and occasion. Shortlist, don't scroll.

## Run locally

```sh
npm ci
npm run dev
```

The product catalog, saved products, basket, and account features use Supabase. Add the project URL and anon key to a local `.env.local` file to enable them:

```sh
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Without those values, the homepage remains available and catalog or account screens explain that live data is not connected. No demo products are substituted.

## Product discovery

Search accepts ordinary product keywords and deterministic phrases such as `vegetarian snacks under ₹100 with at least 15g protein`, `protein powder under ₹2,000`, and `low-sugar post-workout`. Recognized category, brand, dietary, occasion, budget, protein, and sugar terms are shown as interpreted filters. Other text remains a keyword search; ambiguous catalog terms are not silently selected. No AI provider or API key is needed.

Explicit nutrition limits only match nutrition records marked source-verified and measured per serving. Missing or unknown-basis values do not qualify. Budget limits use INR retailer offers already in the database. Results are filtered against explicit requirements before ranking; ranking uses available product fields, known prices, and data freshness, and does not use ratings or reviews.

The `product_nutrition.basis` migration is nullable by design. Existing nutrition rows remain unknown until their measurement basis is verified; apply pending Supabase migrations before using serving-based filters.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```
