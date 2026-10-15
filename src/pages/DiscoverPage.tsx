import { useState, useEffect, useCallback, useMemo } from 'react';
import { SearchBar } from '@/components/SearchBar';
import { SearchInterpretation } from '@/components/SearchInterpretation';
import { FilterPanel } from '@/components/FilterPanel';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { PackageSearch } from 'lucide-react';
import { fetchProducts, fetchCategories, fetchBrands, fetchDietaryAttributes, fetchOccasions } from '@/lib/queries';
import type { ProductWithRelations, Category, Brand, DietaryAttribute, Occasion } from '@/lib/types';
import type { SearchFilters } from '@/lib/filters';
import { emptyFilters, filterProducts } from '@/lib/filters';
import { rankProducts } from '@/lib/ranking';
import { parseSearchQuery, resolveSearchFilters } from '@/lib/search-parser';
import { useRouter, parseQuery } from '@/lib/router';

export function DiscoverPage() {
  const { navigate, path } = useRouter();
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [dietaryAttributes, setDietaryAttributes] = useState<DietaryAttribute[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [filters, setFilters] = useState<SearchFilters>(() => ({
    ...emptyFilters,
    categoryId: parseQuery(path).get('category'),
  }));
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
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-coral-ink">Your next go-to, right this way</p>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-aubergine sm:text-4xl">Discover products</h1>
        <p className="text-sm leading-relaxed text-slate">
          Filter by nutrition, price, diet, and occasion. Missing data is never treated as a match.
        </p>
      </div>

      <div className="mb-6">
        <SearchBar
          initialQuery={filters.query}
          onSearch={(q) => setFilters({ ...filters, query: q })}
        />
        <SearchInterpretation
          recognized={parsedSearch.recognized}
          notes={[...parsedSearch.notes, ...validatedSearch.errors]}
        />
      </div>

      {loading && (
        <div className="py-20 text-center text-sm text-gray-400">Loading products...</div>
      )}

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
            {/* Results header */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate">
                {matchingProducts.length === 0
                  ? 'No products found'
                  : `${matchingProducts.length} product${matchingProducts.length !== 1 ? 's' : ''}`}
              </p>
              {matchingProducts.length > 1 && (
                <button
                  onClick={() => navigate(`/compare?ids=${matchingProducts.slice(0, 4).map((p) => p.id).join(',')}`)}
                  className="ps-btn-secondary min-h-10 px-3 text-xs"
                >
                  Compare top results
                </button>
              )}
            </div>

            {matchingProducts.length === 0 ? (
              products.length === 0 ? (
                <EmptyState
                  icon={<PackageSearch size={28} />}
                  title="No products yet"
                  description="The catalog is empty. Products will appear here once data is imported through the admin panel using Open Food Facts or authorized retailer feeds."
                  action={
                    <button onClick={() => navigate('/admin')} className="ps-btn-primary">
                      Go to admin panel
                    </button>
                  }
                />
              ) : (
                <EmptyState
                  title="Your shortlist starts here."
                  description="No matching products found. Try adjusting your filters."
                  action={
                    <button
                      onClick={() => setFilters({ ...emptyFilters })}
                      className="ps-btn-secondary"
                    >
                      Clear all filters
                    </button>
                  }
                />
              )
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {ranked.map((rp) => (
                  <ProductCard
                    key={rp.product.id}
                    product={rp.product}
                    rankReasons={rp.reasons}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
