import { useCallback, useEffect, useState } from 'react';
import { fetchCategories, fetchProducts } from '@/lib/queries';
import type { Category, ProductWithRelations } from '@/lib/types';
import { EmptyState } from '@/components/EmptyState';
import { Layers, ChevronRight } from 'lucide-react';
import { useRouter } from '@/lib/router';

export function CategoriesPage() {
  const { navigate } = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, prods] = await Promise.all([fetchCategories(), fetchProducts()]);
      setCategories(cats);
      setProducts(prods);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="py-20 text-center text-sm text-gray-400">Loading categories...</div>;
  if (error) {
    return (
      <EmptyState
        icon={<Layers size={28} />}
        title="Categories are unavailable"
        description={error}
        action={<button onClick={load} className="ps-btn-secondary">Try again</button>}
      />
    );
  }

  const productCountByCategory = (catId: string) =>
    products.filter((p) => p.category_id === catId).length;

  if (categories.length === 0) {
    return (
      <EmptyState
        icon={<Layers size={28} />}
        title="No categories yet"
        description="Categories will appear here once products are imported. Categories classify products like protein powder, snacks, breakfast, and more."
        action={<button onClick={() => navigate('/admin')} className="ps-btn-primary">Go to admin panel</button>}
      />
    );
  }

  return (
    <div className="py-8">
      <div className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-coral-ink">A place for every kind of protein</p>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-aubergine sm:text-4xl">Categories</h1>
        <p className="text-sm leading-relaxed text-slate">
          Browse products by category to find exactly what you're looking for.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat, index) => {
          const count = productCountByCategory(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => navigate(`/discover?category=${cat.id}`)}
              className={`ps-card-hover group flex min-h-28 items-center justify-between p-5 text-left ${
                index % 3 === 0 ? 'bg-lavender' : index % 3 === 2 ? 'bg-butter/25' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-aubergine">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="font-heading text-sm font-bold text-aubergine group-hover:text-coral-ink">{cat.name}</h3>
                  <p className="text-xs text-slate">
                    {count} product{count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-aubergine/40 transition-transform group-hover:translate-x-1 group-hover:text-coral-ink" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
