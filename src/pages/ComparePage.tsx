import { useRouter, parseQuery } from '@/lib/router';
import { fetchProductsByIds } from '@/lib/queries';
import type { ProductWithRelations } from '@/lib/types';
import { useEffect, useState } from 'react';
import { formatINR, formatGrams, formatNumber } from '@/lib/format';
import { EmptyState } from '@/components/EmptyState';
import { GitCompare, ExternalLink, ArrowLeft, PackageSearch } from 'lucide-react';
import { isValidRetailerUrl } from '@/lib/format';
import { getComparableProteinMaximum, getNutritionBasisLabel, getNutritionValueStatus, parseComparisonProductIds } from '@/lib/comparison';

export function ComparePage() {
  const { path, navigate } = useRouter();
  const params = parseQuery(path);
  const idsParam = params.get('ids') ?? '';

  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const parsedIds = parseComparisonProductIds(idsParam);
      const ids = parsedIds.ids;
      setLoading(true);
      setError(null);
      if (parsedIds.invalid) {
        setProducts([]);
        setError('This comparison link contains an invalid product identifier. Return to discovery and select products to compare.');
        setLoading(false);
        return;
      }
      if (ids.length < 2) {
        setProducts([]);
        setLoading(false);
        return;
      }
      try {
        const prods = await fetchProductsByIds(ids);
        setProducts(prods);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [idsParam]);

  if (loading) return <div className="py-20 text-center text-sm text-gray-400">Loading comparison...</div>;

  if (error) {
    return (
      <EmptyState
        icon={<GitCompare size={28} />}
        title="Comparison isn't available"
        description={error}
        action={<button onClick={() => navigate('/discover')} className="ps-btn-secondary">Back to discovery</button>}
      />
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<GitCompare size={28} />}
        title="Nothing to compare yet"
        description="Select products from the discover page to compare them side by side. You can compare up to 4 products at a time."
        action={<button onClick={() => navigate('/discover')} className="ps-btn-primary">Browse products</button>}
      />
    );
  }

  type NutritionValueKey =
    | 'protein_g'
    | 'calories'
    | 'carbs_g'
    | 'fat_g'
    | 'sugar_g'
    | 'fiber_g'
    | 'sodium_mg';
  const nutritionRows: { label: string; key: NutritionValueKey }[] = [
    { label: 'Protein (g)', key: 'protein_g' },
    { label: 'Calories', key: 'calories' },
    { label: 'Carbs (g)', key: 'carbs_g' },
    { label: 'Fat (g)', key: 'fat_g' },
    { label: 'Sugar (g)', key: 'sugar_g' },
    { label: 'Fiber (g)', key: 'fiber_g' },
    { label: 'Sodium (mg)', key: 'sodium_mg' },
  ];

  const bestProtein = getComparableProteinMaximum(products);

  const getBestPrice = () => {
    const values = products
      .flatMap((p) => p.retailer_offers ?? [])
      .filter((offer) => offer.currency === 'INR')
      .map((o) => o.price_inr)
      .filter((v): v is number => v != null);
    return values.length > 0 ? Math.min(...values) : null;
  };
  const bestPrice = getBestPrice();

  return (
    <div className="py-6">
      <button onClick={() => history.back()} className="mb-6 flex min-h-11 items-center gap-1.5 text-sm font-semibold text-slate transition-colors hover:text-aubergine">
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-aubergine text-white">
          <GitCompare size={20} />
        </div>
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-coral-ink">Choose with confidence</p>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-aubergine sm:text-3xl">Compare products</h1>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {products.map((product) => {
          const price = (product.retailer_offers ?? [])
            .filter((offer) => offer.currency === 'INR')
            .map((offer) => offer.price_inr)
            .filter((value): value is number => value != null)
            .sort((a, b) => a - b)[0];
          const offer = (product.retailer_offers ?? []).find((item) => isValidRetailerUrl(item.product_url));

          return (
            <article key={product.id} className="ps-card overflow-hidden">
              <button
                onClick={() => navigate(`/products/${product.id}`)}
                className="flex min-h-24 w-full items-center gap-4 bg-lavender/50 p-4 text-left"
              >
                {product.image_url ? (
                  <img src={product.image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-white object-contain p-1" />
                ) : (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white text-aubergine/50">
                    <PackageSearch size={22} />
                  </span>
                )}
                <span className="min-w-0">
                  {product.brand && <span className="block text-[10px] font-bold uppercase tracking-wide text-slate">{product.brand.name}</span>}
                  <span className="mt-1 block font-heading text-sm font-bold leading-snug text-aubergine">{product.name}</span>
                </span>
              </button>
              <div className="grid grid-cols-2 gap-3 p-4">
                <div className="col-span-2 text-xs font-semibold text-slate">
                  Nutrition: {getNutritionBasisLabel(product)}
                  {product.nutrition?.source_verified ? ' · Source verified' : ' · Unverified'}
                </div>
                <div className="rounded-xl bg-butter/30 p-3">
                  <p className="text-xs font-medium text-slate">Best price</p>
                  <p className="mt-1 font-bold text-aubergine">{price != null ? formatINR(price) : '—'}</p>
                </div>
                {nutritionRows.map((row) => {
                  const value = product.nutrition?.[row.key];
                  return (
                    <div key={row.key} className="rounded-xl bg-ivory p-3">
                      <p className="text-xs font-medium text-slate">{row.label}</p>
                      <p className="mt-1 font-semibold text-aubergine">
                        {typeof value !== 'number'
                          ? 'Not available'
                          : row.key === 'sodium_mg' || row.key === 'calories'
                            ? formatNumber(value)
                            : formatNumber(value, 1)}
                      </p>
                      {typeof value === 'number' && getNutritionValueStatus(product, value) && (
                        <p className="mt-1 text-[10px] text-slate">{getNutritionValueStatus(product, value)}</p>
                      )}
                    </div>
                  );
                })}
                <div className="col-span-2">
                  <p className="mb-2 text-xs font-semibold text-slate">Dietary</p>
                  {(product.dietary_attributes ?? []).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {product.dietary_attributes?.map((attribute) => (
                        <span key={attribute.id} className="ps-badge-gray">{attribute.name}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate">—</span>
                  )}
                </div>
                {offer && isValidRetailerUrl(offer.product_url) && (
                  <a
                    href={offer.product_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="ps-btn-primary col-span-2"
                  >
                    Buy Now <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="ps-card hidden overflow-x-auto p-2 sm:p-3 md:block">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr>
              <th className="w-40 border-b border-mist p-3 text-left text-xs font-semibold uppercase tracking-wide text-slate">
                Attribute
              </th>
              {products.map((p) => (
                <th key={p.id} className="border-b border-gray-200 p-3 text-left min-w-[200px]">
                  <button
                    onClick={() => navigate(`/products/${p.id}`)}
                    className="text-left"
                  >
                    {p.image_url && (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="mb-2 h-16 w-16 rounded-xl object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <p className="font-heading text-sm font-bold leading-snug text-aubergine hover:text-coral-ink">{p.name}</p>
                      {p.brand && <p className="text-xs text-slate">{p.brand.name}</p>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Price */}
            <tr>
              <td className="border-b border-mist p-3 text-sm font-medium text-slate">Best price</td>
              {products.map((p) => {
                const prices = (p.retailer_offers ?? [])
                  .map((o) => o.price_inr)
                  .filter((v): v is number => v != null);
                const best = prices.length > 0 ? Math.min(...prices) : null;
                return (
                  <td key={p.id} className="border-b border-mist p-3 text-sm">
                    {best != null ? (
                      <span className={`font-bold ${bestPrice === best ? 'text-coral-ink' : 'text-aubergine'}`}>
                        {formatINR(best)}
                        {bestPrice === best && <span className="ml-1 text-xs text-coral-ink">Best</span>}
                      </span>
                    ) : (
                      <span className="text-slate">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="border-b border-mist p-3 text-sm font-medium text-slate">Nutrition basis</td>
              {products.map((product) => (
                <td key={product.id} className="border-b border-mist p-3 text-sm text-aubergine">
                  {getNutritionBasisLabel(product)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border-b border-mist p-3 text-sm font-medium text-slate">Nutrition source</td>
              {products.map((product) => (
                <td key={product.id} className="border-b border-mist p-3 text-sm text-aubergine">
                  {!product.nutrition
                    ? 'Not available'
                    : product.nutrition.source_verified ? 'Verified' : 'Unverified'}
                </td>
              ))}
            </tr>

            {/* Nutrition rows */}
            {nutritionRows.map((row) => (
              <tr key={row.key}>
                <td className="border-b border-mist p-3 text-sm font-medium text-slate">{row.label}</td>
                {products.map((p) => {
                  const value = p.nutrition?.[row.key];
                  const isBestProtein = row.key === 'protein_g' && value != null && value === bestProtein;
                  return (
                    <td key={p.id} className="border-b border-mist p-3 text-sm">
                      {value != null ? (
                        <span className={isBestProtein ? 'font-bold text-coral-ink' : 'text-aubergine'}>
                          {row.key === 'sodium_mg' ? formatNumber(value as number) : row.key === 'calories' ? formatNumber(value as number) : formatNumber(value as number, 1)}
                                {isBestProtein && <span className="ml-1 text-xs text-coral-ink">Highest verified</span>}
                        </span>
                      ) : (
                              <span className="text-slate">Not available</span>
                      )}
                            {value != null && getNutritionValueStatus(p, value) && (
                              <span className="ml-1 text-xs text-slate">{getNutritionValueStatus(p, value)}</span>
                            )}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Serving size */}
            <tr>
              <td className="border-b border-mist p-3 text-sm font-medium text-slate">Serving size</td>
              {products.map((p) => (
                <td key={p.id} className="border-b border-mist p-3 text-sm text-aubergine">
                  {p.serving_size ?? (p.serving_size_grams != null ? formatGrams(p.serving_size_grams) : '—')}
                </td>
              ))}
            </tr>

            {/* Dietary */}
            <tr>
              <td className="border-b border-mist p-3 text-sm font-medium text-slate">Dietary</td>
              {products.map((p) => (
                <td key={p.id} className="border-b border-gray-100 p-3">
                  <div className="flex flex-wrap gap-1">
                    {(p.dietary_attributes ?? []).length === 0 ? (
                      <span className="text-xs text-slate">—</span>
                    ) : (
                      (p.dietary_attributes ?? []).map((d) => (
                        <span key={d.id} className="ps-badge-gray">{d.name}</span>
                      ))
                    )}
                  </div>
                </td>
              ))}
            </tr>

            {/* Buy Now */}
            <tr>
              <td className="p-3 text-sm font-medium text-slate">Buy now</td>
              {products.map((p) => {
                const offer = (p.retailer_offers ?? []).find((o) => isValidRetailerUrl(o.product_url));
                return (
                  <td key={p.id} className="p-3">
                    {offer && isValidRetailerUrl(offer.product_url) ? (
                      <a
                        href={offer.product_url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="ps-btn-primary text-xs"
                      >
                        Buy Now <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-xs text-slate">No offer available</span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate">
        Missing values shown as — are unavailable, not zero. Rankings and comparisons only use data that actually exists.
      </p>
    </div>
  );
}
