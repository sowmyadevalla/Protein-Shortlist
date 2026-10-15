import { Heart, ExternalLink, Tag, Leaf } from 'lucide-react';
import type { ProductWithRelations } from '@/lib/types';
import { formatINR, formatProteinPer100g, isValidRetailerUrl } from '@/lib/format';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { getSupabaseClient, supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';

interface ProductCardProps {
  product: ProductWithRelations;
  rankReasons?: { label: string; detail: string; positive: boolean }[];
}

export function ProductCard({ product, rankReasons }: ProductCardProps) {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
    if (!user || !supabase) return;
    (async () => {
      const { data } = await getSupabaseClient()
        .from('saved_products')
        .select('id')
        .eq('product_id', product.id)
        .eq('user_id', user.id)
        .maybeSingle();
      setSaved(!!data);
    })();
  }, [product.id, user]);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !supabase) {
      navigate('/profile');
      return;
    }
    setSaving(true);
    if (saved) {
      await getSupabaseClient()
        .from('saved_products')
        .delete()
        .eq('product_id', product.id)
        .eq('user_id', user.id);
      setSaved(false);
    } else {
      await getSupabaseClient()
        .from('saved_products')
        .insert({ product_id: product.id });
      setSaved(true);
    }
    setSaving(false);
  };

  const offers = product.retailer_offers ?? [];
  const bestOffer = offers
    .filter((offer) => offer.currency === 'INR' && offer.price_inr != null)
    .sort((a, b) => a.price_inr! - b.price_inr!)[0];
  const verifiedProtein = product.nutrition?.source_verified === true
    && product.nutrition.basis
    ? product.nutrition.protein_g
    : null;
  const validOffer = offers.find((offer) => isValidRetailerUrl(offer.product_url));
  const updatedAt = [
    product.updated_at,
    ...(product.source_links ?? []).map((source) => source.last_synced_at),
  ]
    .filter(Boolean)
    .map((date) => Date.parse(date))
    .filter((date) => Number.isFinite(date) && date <= Date.now())
    .sort((a, b) => b - a)[0];

  return (
    <article className="ps-card-hover group overflow-hidden">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-lavender/50">
        {product.image_url && !imageFailed ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-contain p-5 transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-aubergine/45">
            <Tag size={32} />
            <span className="text-xs font-medium">Image unavailable</span>
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-mist bg-white text-aubergine transition-colors hover:bg-lavender active:scale-95"
          aria-label={saved ? 'Remove from saved' : 'Save product'}
          aria-pressed={saved}
        >
          <Heart
            size={16}
            className={saved ? 'fill-coral-ink text-coral-ink' : 'text-slate'}
          />
        </button>
        {verifiedProtein != null && (
          <div className="absolute left-3 top-3 rounded-full bg-aubergine px-3 py-1.5 text-xs font-semibold text-white">
            {formatProteinPer100g(verifiedProtein)} protein / {product.nutrition?.basis === 'per_serving' ? 'serving' : '100g'}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {product.brand && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate">{product.brand.name}</p>
        )}
        <button
          onClick={() => navigate(`/products/${product.id}`)}
          className="line-clamp-2 text-left font-heading text-base font-bold leading-snug text-aubergine hover:text-coral-ink"
        >
          {product.name}
        </button>

        {/* Dietary tags */}
        {(product.dietary_attributes ?? []).length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {(product.dietary_attributes ?? []).slice(0, 2).map((d) => (
              <span key={d.id} className="ps-badge-gray">
                <Leaf size={10} />
                {d.name}
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        {bestOffer?.price_inr != null && (
          <p className="mt-3 text-lg font-bold text-aubergine">
            {formatINR(bestOffer.price_inr)}
            {bestOffer.retailer?.name && <span className="ml-1 text-xs font-normal text-slate">at {bestOffer.retailer.name}</span>}
          </p>
        )}
        {product.nutrition && product.nutrition.source_verified !== true && (
          <p className="mt-2 text-xs text-slate">Nutrition data is not verified.</p>
        )}
        {updatedAt != null && (
          <p className="mt-2 text-[11px] text-slate">
            Data updated {new Date(updatedAt).toLocaleDateString('en-IN')}
          </p>
        )}

        {/* Rank reasons */}
        {rankReasons && rankReasons.length > 0 && (
          <div className="mt-3 space-y-1 border-t border-mist pt-3">
            {rankReasons.slice(0, 3).map((r, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs">
                <span className={r.positive ? 'text-coral-ink' : 'text-slate/60'}>
                  {r.positive ? '+' : '•'}
                </span>
                <span className="text-slate">
                  <span className="font-medium text-aubergine">{r.label}</span>
                  {' — '}
                  {r.detail}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Buy now */}
        {validOffer && isValidRetailerUrl(validOffer.product_url) && (
          <a
            href={validOffer.product_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={(e) => e.stopPropagation()}
            className="ps-btn-primary mt-3.5 w-full text-xs"
          >
            Buy Now
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </article>
  );
}
