import { useState, useEffect, type FormEvent } from 'react';
import { ArrowRight, Search, Sparkles } from 'lucide-react';
import { useRouter } from '@/lib/router';

const exampleQueries = [
  { label: 'High-protein breakfast', query: 'high-protein breakfast' },
  { label: 'Vegetarian snacks under ₹100', query: 'vegetarian snacks under ₹100' },
  { label: 'Protein for post-workout', query: 'protein for post-workout' },
  { label: 'Compare protein powders', query: 'compare protein powders' },
];

interface SearchBarProps {
  initialQuery?: string;
  size?: 'default' | 'large';
  onSearch?: (query: string) => void;
}

export function SearchBar({ initialQuery = '', size = 'default', onSearch }: SearchBarProps) {
  const { navigate } = useRouter();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (onSearch) {
      onSearch(trimmed);
    } else {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleExample = (q: string) => {
    setQuery(q);
    if (onSearch) {
      onSearch(q);
    } else {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  const inputSize = size === 'large' ? 'h-14 text-base' : 'h-11 text-sm';

  return (
    <div className="w-full">
      {size === 'large' && (
        <label htmlFor="protein-shortlist-search" className="mb-2 block text-sm font-semibold text-aubergine">
          What are you looking for?
        </label>
      )}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search
            size={size === 'large' ? 22 : 18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            id={size === 'large' ? 'protein-shortlist-search' : undefined}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search protein products"
            placeholder="Tell us what you're looking for…"
            className={`ps-input ${inputSize} pl-12 ${size === 'large' ? 'pr-44' : ''}`}
          />
          {size === 'large' && (
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 flex min-h-11 -translate-y-1/2 items-center gap-2 rounded-lg bg-coral px-4 text-sm font-semibold text-aubergine transition-colors hover:bg-aubergine hover:text-white"
            >
              Find My Shortlist
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </form>

      {size === 'large' && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-medium text-slate">
            <Sparkles size={14} />
            Try:
          </span>
          {exampleQueries.map((ex) => (
            <button
              key={ex.label}
              onClick={() => handleExample(ex.query)}
              className="min-h-10 rounded-full border border-mist bg-white px-3.5 py-2 text-xs font-medium text-aubergine transition-colors hover:border-aubergine/30 hover:bg-lavender"
            >
              {ex.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
