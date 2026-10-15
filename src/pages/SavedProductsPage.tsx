import { useEffect, useState } from 'react';
import { getSupabaseClient, supabase } from '@/lib/supabase';
import { fetchProductsByIds } from '@/lib/queries';
import type { ProductWithRelations } from '@/lib/types';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { Heart, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';

export function SavedProductsPage() {
  const { user, loading: authLoading } = useAuth();
  const { navigate } = useRouter();
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !supabase) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data } = await getSupabaseClient()
          .from('saved_products')
          .select('product_id')
          .eq('user_id', user.id);
        const ids = (data ?? []).map((r) => r.product_id);
        if (ids.length === 0) {
          setProducts([]);
          setLoading(false);
          return;
        }
        const prods = await fetchProductsByIds(ids);
        setProducts(prods);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return <div className="py-20 text-center text-sm text-gray-400">Loading...</div>;
  }

  if (!user) {
    return (
      <EmptyState
        icon={<LogIn size={28} />}
        title="Sign in to save products"
        description="Create an account or sign in to shortlist products and access them across devices."
        action={<button onClick={() => navigate('/profile')} className="ps-btn-primary">Sign in</button>}
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<Heart size={28} />}
        title="Saved products couldn't be loaded"
        description={error}
        action={<button onClick={() => navigate('/discover')} className="ps-btn-secondary">Browse products</button>}
      />
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<Heart size={28} />}
        title="No saved products yet"
        description="Tap the heart icon on any product to save it here. Your shortlist helps you compare and decide."
        action={<button onClick={() => navigate('/discover')} className="ps-btn-primary">Discover products</button>}
      />
    );
  }

  return (
    <div className="py-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900">Saved products</h1>
        <p className="text-sm leading-relaxed text-gray-500">Your shortlist of products, saved across devices.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
