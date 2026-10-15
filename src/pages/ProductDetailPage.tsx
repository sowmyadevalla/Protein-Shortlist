import { useParams } from '@/lib/router-utils';
import { fetchProduct, fetchRetailers } from '@/lib/queries';
import type { ProductWithRelations, Retailer } from '@/lib/types';
import { formatINR, formatGrams, formatNumber, isValidRetailerUrl } from '@/lib/format';
import { EmptyState } from '@/components/EmptyState';
import { PackageX, Heart, ExternalLink, ShoppingBasket, ArrowLeft, Leaf, Tag, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { getSupabaseClient, supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';

export function ProductDetailPage() {
  const { id } = useParams();
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [product, setProduct] = useState<ProductWithRelations | null>(null);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      setImageFailed(false);
      try {
        const [prod, rets] = await Promise.all([fetchProduct(id), fetchRetailers()]);
        setProduct(prod);
        setRetailers(rets);
        if (user) {
          const { data } = await getSupabaseClient()
            .from('saved_products')
            .select('id')
            .eq('product_id', id)
            .eq('user_id', user.id)
            .maybeSingle();
          setSaved(!!data);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user]);

  const handleSave = async () => {
    if (!user || !supabase) {
      navigate('/profile');
      return;
    }
    if (!product) return;
    setSaving(true);
    if (saved) {
      await getSupabaseClient().from('saved_products').delete().eq('product_id', product.id).eq('user_id', user.id);
      setSaved(false);
    } else {
      await getSupabaseClient().from('saved_products').insert({ product_id: product.id });
      setSaved(true);
    }
    setSaving(false);
  };

  const handleAddToBasket = async (offerId: string) => {
    if (!user || !supabase) {
      navigate('/profile');
      return;
    }
    await getSupabaseClient().from('shopping_carts').upsert({
      user_id: user.id,
      retailer_offer_id: offerId,
      quantity: 1,
    }, { onConflict: 'user_id,retailer_offer_id' });
    navigate('/basket');
  };

  if (loading) return <div className="py-20 text-center text-sm text-slate">Loading product...</div>;
  if (error) return <div role="alert" className="py-20 text-center text-sm text-red-700">{error}</div>;
  if (!product) {
    return (
      <EmptyState
        icon={<PackageX size={28} />}
        title="Product not found"
        description="This product may have been removed or the link is incorrect."
        action={<button onClick={() => navigate('/discover')} className="ps-btn-primary">Browse products</button>}
      />
    );
  }

  const nutrition = product.nutrition;
  const offers = product.retailer_offers ?? [];

  return (
    <div className="py-4 sm:py-6">
      <button onClick={() => history.back()} className="mb-6 flex min-h-11 items-center gap-1.5 text-sm font-semibold text-slate transition-colors hover:text-aubergine">
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Image */}
        <div className="ps-card aspect-square overflow-hidden bg-lavender/50">
          {product.image_url && !imageFailed ? (
            <img src={product.image_url} alt={product.name} className="h-full w-full object-contain p-6 sm:p-10" onError={() => setImageFailed(true)} />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-aubergine/45">
              <Tag size={64} />
              <span className="text-sm font-medium">Image unavailable</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          {product.brand && (
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-slate">{product.brand.name}</p>
          )}
          <h1 className="mb-3 font-heading text-3xl font-extrabold tracking-tight text-aubergine sm:text-4xl">{product.name}</h1>

          {product.category && (
            <p className="mb-5">
              <span className="ps-badge-gray">{product.category.name}</span>
            </p>
          )}

          {product.description && (
            <p className="mb-7 text-sm leading-relaxed text-slate">{product.description}</p>
          )}

          {/* Dietary attributes */}
          {(product.dietary_attributes ?? []).length > 0 && (
            <div className="mb-7">
              <h3 className="ps-label">Dietary</h3>
              <div className="flex flex-wrap gap-2">
                {(product.dietary_attributes ?? []).map((d) => (
                  <span key={d.id} className="ps-badge-gray">
                    <Leaf size={12} />
                    {d.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mb-7 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              aria-pressed={saved}
              className="ps-btn-secondary"
            >
              <Heart size={16} className={saved ? 'fill-coral-ink text-coral-ink' : ''} />
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>

          {/* Nutrition */}
          <div className="mb-7">
            <h3 className="mb-3 flex flex-wrap items-center gap-2 text-sm font-bold text-aubergine">
              Nutrition <span className="text-xs font-medium text-slate">per {product.serving_size_grams != null ? 'serving' : '100g'}</span> {nutrition?.source_verified && (
                <span className="ps-badge-green">
                  <CheckCircle2 size={12} />
                  Verified
                </span>
              )}
            </h3>
            {nutrition ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <NutritionBox label="Protein" value={formatGrams(nutrition.protein_g)} highlight />
                <NutritionBox label="Calories" value={formatNumber(nutrition.calories)} />
                <NutritionBox label="Carbs" value={formatGrams(nutrition.carbs_g)} />
                <NutritionBox label="Fat" value={formatGrams(nutrition.fat_g)} />
                <NutritionBox label="Sugar" value={formatGrams(nutrition.sugar_g)} />
                <NutritionBox label="Fiber" value={formatGrams(nutrition.fiber_g)} />
                <NutritionBox label="Sodium" value={formatGrams(nutrition.sodium_mg, 'mg')} />
                <NutritionBox
                  label="Serving"
                  value={product.serving_size ?? (product.serving_size_grams ? `${product.serving_size_grams}g` : '—')}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-mist bg-white px-4 py-3 text-sm text-slate">
                <AlertCircle size={16} />
                No nutrition data available for this product.
              </div>
            )}
          </div>

          {/* Retailer offers */}
          <div>
            <h3 className="mb-3 text-sm font-bold text-aubergine">Retailer offers</h3>
            {offers.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-mist bg-white px-4 py-3 text-sm text-slate">
                <AlertCircle size={16} />
                No retailer offers available. Buy Now appears only when an authorized retailer URL exists.
              </div>
            ) : (
              <div className="space-y-3">
                {offers.map((offer) => {
                  const retailer = retailers.find((r) => r.id === offer.retailer_id);
                  return (
                    <div key={offer.id} className="ps-card flex flex-wrap items-center justify-between gap-4 p-4">
                      <div>
                        <p className="text-sm font-bold text-aubergine">
                          {retailer?.name ?? 'Unknown retailer'}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate">
                          <span className="font-semibold text-aubergine">
                            {offer.price_inr != null ? formatINR(offer.price_inr) : 'Price unavailable'}
                          </span>
                          {offer.in_stock === true && <span className="ps-badge-green">In stock</span>}
                          {offer.in_stock === false && <span className="ps-badge-amber">Out of stock</span>}
                          {offer.in_stock == null && <span className="ps-badge-gray">Stock unknown</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {isValidRetailerUrl(offer.product_url) && (
                          <>
                            <button
                              onClick={() => handleAddToBasket(offer.id)}
                              className="ps-btn-secondary text-xs"
                            >
                              <ShoppingBasket size={14} />
                              Add
                            </button>
                            <a
                              href={offer.product_url}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="ps-btn-primary text-xs"
                            >
                              Buy Now
                              <ExternalLink size={12} />
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Source provenance */}
          {(product.source_links ?? []).length > 0 && (
            <div className="mt-7 border-t border-mist pt-5">
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate">
                <Database size={14} />
                Data sources
              </h3>
              <div className="space-y-2">
                {(product.source_links ?? []).map((link) => (
                  <div key={link.id} className="flex flex-wrap items-center gap-2 text-xs text-slate">
                    <span className="font-medium text-aubergine">External ID: {link.external_id}</span>
                    {link.external_url && (
                      <a
                        href={link.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-aubergine hover:text-coral-ink hover:underline"
                      >
                        View source <ExternalLink size={10} className="inline" />
                      </a>
                    )}
                    <span>Last synced: {new Date(link.last_synced_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NutritionBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3.5 ${highlight ? 'border-coral/40 bg-butter/35' : 'border-mist bg-white'}`}>
      <p className="text-xs font-medium text-slate">{label}</p>
      <p className="mt-1 text-lg font-bold text-aubergine">{value}</p>
    </div>
  );
}
