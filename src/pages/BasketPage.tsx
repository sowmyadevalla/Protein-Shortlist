import { useCallback, useEffect, useState } from 'react';
import { getSupabaseClient, supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import type { ShoppingCartWithRelations } from '@/lib/types';
import { formatINR, isValidRetailerUrl } from '@/lib/format';
import { EmptyState } from '@/components/EmptyState';
import { ShoppingBasket, LogIn, Trash2, ExternalLink, Minus, Plus } from 'lucide-react';

export function BasketPage() {
  const { user, loading: authLoading } = useAuth();
  const { navigate } = useRouter();
  const [items, setItems] = useState<ShoppingCartWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !supabase) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await getSupabaseClient()
        .from('shopping_carts')
        .select(`
          *,
          retailer_offer:retailer_offers(
            *,
            retailer:retailers(*),
            product:products(*)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setItems((data ?? []) as ShoppingCartWithRelations[]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    load();
  }, [user, authLoading, load]);

  const updateQty = async (id: string, qty: number) => {
    if (qty < 1 || !supabase) return;
    await getSupabaseClient().from('shopping_carts').update({ quantity: qty }).eq('id', id);
    load();
  };

  const removeItem = async (id: string) => {
    if (!supabase) return;
    await getSupabaseClient().from('shopping_carts').delete().eq('id', id);
    load();
  };

  if (authLoading || loading) return <div className="py-20 text-center text-sm text-gray-400">Loading...</div>;

  if (!user) {
    return (
      <EmptyState
        icon={<LogIn size={28} />}
        title="Sign in to use your basket"
        description="Create an account or sign in to add products to your basket from authorized retailers."
        action={<button onClick={() => navigate('/profile')} className="ps-btn-primary">Sign in</button>}
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<ShoppingBasket size={28} />}
        title="Your basket couldn't be loaded"
        description={error}
        action={<button onClick={load} className="ps-btn-secondary">Try again</button>}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBasket size={28} />}
        title="Your basket is empty"
        description="Add products to your basket from the product detail page. Buy Now links go directly to the authorized retailer."
        action={<button onClick={() => navigate('/discover')} className="ps-btn-primary">Discover products</button>}
      />
    );
  }

  const total = items.reduce((sum, item) => {
    const price = item.retailer_offer?.price_inr;
    return price != null ? sum + price * item.quantity : sum;
  }, 0);

  return (
    <div className="py-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900">Basket</h1>
        <p className="text-sm leading-relaxed text-gray-500">Review your items before buying from authorized retailers.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            const offer = item.retailer_offer;
            const product = offer?.product;
            const retailer = offer?.retailer;
            return (
              <div key={item.id} className="ps-card p-4">
                <div className="flex gap-4">
                  {product?.image_url && (
                    <img
                      src={product.image_url}
                      alt={product?.name ?? ''}
                      className="h-20 w-20 rounded-lg object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="flex-1">
                    <button
                      onClick={() => product && navigate(`/products/${product.id}`)}
                      className="text-left text-sm font-semibold text-gray-900 hover:text-gray-700"
                    >
                      {product?.name ?? 'Unknown product'}
                    </button>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {retailer?.name ?? 'Unknown retailer'}
                    </p>
                    {offer?.price_inr != null && (
                      <p className="mt-2 text-base font-bold text-gray-900">{formatINR(offer.price_inr)}</p>
                    )}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 p-0.5">
                        <button
                          onClick={() => updateQty(item.id, item.quantity - 1)}
                          className="rounded p-1 hover:bg-gray-100"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="min-w-[2rem] text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.id, item.quantity + 1)}
                          className="rounded p-1 hover:bg-gray-100"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                      {isValidRetailerUrl(offer?.product_url) && (
                        <a
                          href={offer.product_url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="ml-auto ps-btn-primary text-xs"
                        >
                          Buy Now <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="ps-card sticky top-20 p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Basket summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Items</span>
                <span>{items.length}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Estimated total</span>
                <span className="font-bold text-gray-900">{formatINR(total)}</span>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-500">
              Checkout happens on the retailer&apos;s website. Click Buy Now to go to the authorized retailer page.
              Protein Shortlist does not process payments or handle delivery.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
