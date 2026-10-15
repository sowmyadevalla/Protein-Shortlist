import { useState, useEffect, useCallback, useMemo } from 'react';
import { SearchBar } from '@/components/SearchBar';
import { SearchInterpretation } from '@/components/SearchInterpretation';
import { FilterPanel } from '@/components/FilterPanel';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { SearchX } from 'lucide-react';
import { fetchProducts, fetchCategories, fetchBrands, fetchDietaryAttributes, fetchOccasions } from '@/lib/queries';
import type { ProductWithRelations, Category, Brand, DietaryAttribute, Occasion } from '@/lib/types';
import type { SearchFilters } from '@/lib/filters';
import { emptyFilters, filterProducts } from '@/lib/filters';
import { rankProducts } from '@/lib/ranking';
import { parseSearchQuery, resolveSearchFilters } from '@/lib/search-parser';
import { useRouter, parseQuery } from '@/lib/router';

export function SearchPage() {
  const { navigate, path } = useRouter();
  const queryParams = parseQuery(path);
  const initialQuery = queryParams.get('q') ?? '';

  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [dietaryAttributes, setDietaryAttributes] = useState<DietaryAttribute[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({ ...emptyFilters, query: initialQuery });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prods, cats, brnds, diet, occ] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
        fetchBrands(),
        fetchDietaryAttributes(),
        fetchOccasions(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setBrands(brnds);
      setDietaryAttributes(diet);
      setOccasions(occ);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setFilters((current) => ({ ...current, query: initialQuery }));
  }, [initialQuery]);

  const parsedSearch = useMemo(
    () => parseSearchQuery(filters.query, { categories, brands, dietaryAttributes, occasions }),
    [filters.query, categories, brands, dietaryAttributes, occasions]
  );
  const validatedSearch = useMemo(() => resolveSearchFilters(filters, parsedSearch), [filters, parsedSearch]);
  const effectiveFilters = validatedSearch.filters;
  const matchingProducts = filterProducts(products, effectiveFilters);
  const ranked = rankProducts(matchingProducts, effectiveFilters);

  const handleFiltersChange = (nextFilters: SearchFilters) => {
    setFilters({ ...nextFilters, query: parsedSearch.remainingQuery });
  };

  return (
    <div className="py-8">
      <div className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-coral-ink">Your search, thoughtfully sorted</p>
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-aubergine sm:text-4xl">
          {filters.query ? `Results for "${filters.query}"` : 'Search'}
        </h1>
        <SearchBar
          initialQuery={filters.query}
          onSearch={(q) => setFilters({ ...filters, query: q })}
        />
        <SearchInterpretation
          recognized={parsedSearch.recognized}
          notes={[...parsedSearch.notes, ...validatedSearch.errors]}
        />
      </div>

      {loading && <div className="py-20 text-center text-sm text-gray-400">Loading...</div>}

      {error && (
        <div role="alert" className="py-20 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={load} className="ps-btn-secondary mt-4">Retry</button>
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
          <div className="lg:w-64 lg:shrink-0">
            <FilterPanel
              categories={categories}
              brands={brands}
              dietaryAttributes={dietaryAttributes}
              occasions={occasions}
              filters={effectiveFilters}
              onFiltersChange={handleFiltersChange}
              resultCount={matchingProducts.length}
            />
          </div>

          <div className="flex-1">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate">
                {matchingProducts.length === 0
                  ? 'No products found'
                  : `${matchingProducts.length} result${matchingProducts.length !== 1 ? 's' : ''}`}
              </p>
              {matchingProducts.length > 1 && (
                <button
                  onClick={() => navigate(`/compare?ids=${matchingProducts.slice(0, 4).map((product) => product.id).join(',')}`)}
                  className="ps-btn-secondary min-h-10 px-3 text-xs"
                >
                  Compare top results
                </button>
              )}
            </div>

            {matchingProducts.length === 0 ? (
              <EmptyState
                icon={<SearchX size={28} />}
                title={products.length === 0 ? 'Product data is not connected yet' : 'Your shortlist starts here.'}
                description={
                  products.length === 0
                    ? 'The catalog has no connected products yet. Adjust the filters, explore available categories, or connect an authorized data source.'
                    : 'No matching products found. Try adjusting your search or filters. Missing data never counts as a match.'
                }
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    <button onClick={() => setFilters({ ...emptyFilters })} className="ps-btn-secondary">
                      Clear filters
                    </button>
                    {products.length === 0 && (
                      <button onClick={() => navigate('/categories')} className="ps-btn-primary">
                        Explore categories
                      </button>
                    )}
                  </div>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {ranked.map((rp) => (
                  <ProductCard key={rp.product.id} product={rp.product} rankReasons={rp.reasons} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
