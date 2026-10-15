import { SearchBar } from '@/components/SearchBar';
import { useRouter } from '@/lib/router';
import { FlaskConical, Leaf, TrendingUp, ShieldCheck, ArrowRight, ArrowUpRight, Layers } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchCategories } from '@/lib/queries';
import type { Category } from '@/lib/types';

export function HomePage() {
  const { navigate } = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesUnavailable, setCategoriesUnavailable] = useState(false);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => setCategoriesUnavailable(true));
  }, []);

  const features = [
    {
      icon: FlaskConical,
      title: 'Nutrition-first discovery',
      description: 'Filter by protein content, sugar, calories, and dietary requirements. Missing data is never treated as zero.',
    },
    {
      icon: TrendingUp,
      title: 'Transparent ranking',
      description: 'Every recommendation comes with reasons. See exactly why a product matches your criteria.',
    },
    {
      icon: Leaf,
      title: 'Diet-aware',
      description: 'Vegetarian, vegan, gluten-free, and more. Your dietary constraints are always respected.',
    },
    {
      icon: ShieldCheck,
      title: 'Real data only',
      description: 'Product data from Open Food Facts. Prices from authorized retailer feeds. No fabricated information.',
    },
  ];

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <section className="overflow-hidden border-b border-mist bg-ivory">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_0.95fr] lg:gap-16 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-aubergine">
              <span className="h-2 w-2 rounded-full bg-coral" />
              India's protein product shortlist
            </p>
            <h1 className="max-w-xl text-5xl font-extrabold leading-[1.04] tracking-[-0.055em] text-aubergine sm:text-6xl lg:text-[4.5rem]">
              Your protein picks.{' '}
              <span className="block text-coral-ink">Shortlisted.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate sm:text-lg">
              Less scrolling. Smarter choices. Find protein products that fit your budget, diet and everyday routine.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button onClick={() => navigate('/categories')} className="ps-btn-secondary">
                Explore Categories
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-5 -top-6 h-24 w-24 rounded-full bg-butter/70 sm:-right-8 sm:-top-9 sm:h-32 sm:w-32" />
            <div className="relative rounded-3xl border border-mist bg-white p-5 shadow-[0_24px_60px_-44px_rgba(48,33,61,0.4)] sm:p-7">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">A better way to browse</p>
                  <p className="mt-1 font-heading text-lg font-bold text-aubergine">Start with what you need.</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lavender text-aubergine">
                  <Layers size={20} />
                </span>
              </div>
              <SearchBar size="large" />
            </div>
            <p className="relative mt-4 text-center text-xs text-slate">
              Shortlist, don&apos;t scroll.
            </p>
          </div>
        </div>
      </section>

      {(categories.length > 0 || categoriesUnavailable) && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-coral-ink">Find your kind of fuel</p>
              <h2 className="text-2xl font-bold tracking-tight text-aubergine sm:text-3xl">Browse by category</h2>
            </div>
            <button onClick={() => navigate('/categories')} className="ps-btn-ghost shrink-0 text-sm">
              All categories <ArrowRight size={15} />
            </button>
          </div>
          {categoriesUnavailable && categories.length === 0 ? (
            <p className="rounded-2xl border border-mist bg-white p-5 text-sm text-slate">
              Categories are temporarily unavailable. You can still browse the full catalog.
              <button onClick={() => navigate('/discover')} className="ml-1 font-semibold text-aubergine underline underline-offset-2">
                Browse products
              </button>
            </p>
          ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories.slice(0, 10).map((category, index) => (
              <button
                key={category.id}
                onClick={() => navigate(`/discover?category=${encodeURIComponent(category.id)}`)}
                className={`group flex min-h-32 flex-col justify-between rounded-2xl border border-mist p-4 text-left transition-transform hover:-translate-y-0.5 ${
                  index % 3 === 0 ? 'bg-lavender' : index % 3 === 1 ? 'bg-white' : 'bg-butter/45'
                }`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-aubergine">
                  <Layers size={17} />
                </span>
                <span className="flex items-end justify-between gap-2">
                  <span className="font-heading text-sm font-bold leading-snug text-aubergine">{category.name}</span>
                  <ArrowUpRight size={16} className="shrink-0 text-aubergine/50 transition-colors group-hover:text-coral-ink" />
                </span>
              </button>
            ))}
          </div>
          )}
        </section>
      )}

      <section className="border-y border-mist bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mb-9 max-w-2xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-coral-ink">Made for real-life choices</p>
            <h2 className="text-2xl font-bold tracking-tight text-aubergine sm:text-3xl">
              Built for decisions, not browsing
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate sm:text-base">
              Find your fit with clear nutrition, honest product data, and recommendations you can understand.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-2xl border border-mist bg-ivory p-5">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-lavender text-aubergine">
                    <Icon size={20} />
                  </div>
                  <h3 className="mb-2 text-sm font-bold text-aubergine">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-slate">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-lavender/50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-coral-ink">Simple by design</p>
            <h2 className="text-2xl font-bold tracking-tight text-aubergine sm:text-3xl">From question to shortlist</h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { step: '01', title: 'Tell us what you need', desc: 'Search in natural language or use structured filters for protein, price, diet, and more.' },
              { step: '02', title: 'See your shortlist', desc: 'We rank products by your criteria and explain why each one matches. No opaque scores.' },
              { step: '03', title: 'Compare and save', desc: 'Compare products side by side, save your shortlist, and buy from authorized retailers.' },
            ].map((s) => (
              <div key={s.step} className="flex gap-4 text-left md:flex-col md:items-center md:text-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-aubergine text-sm font-bold text-white">
                  {s.step}
                </div>
                <div>
                  <h3 className="mb-2 text-base font-bold text-aubergine">{s.title}</h3>
                  <p className="mx-auto max-w-xs text-sm leading-relaxed text-slate">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
