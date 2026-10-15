import { useState, useMemo } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import type { Category, Brand, DietaryAttribute, Occasion } from '@/lib/types';
import type { SearchFilters } from '@/lib/filters';
import { emptyFilters } from '@/lib/filters';

interface FilterPanelProps {
  categories: Category[];
  brands: Brand[];
  dietaryAttributes: DietaryAttribute[];
  occasions: Occasion[];
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  resultCount: number;
}

export function FilterPanel({
  categories,
  brands,
  dietaryAttributes,
  occasions,
  filters,
  onFiltersChange,
  resultCount,
}: FilterPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categoryId) count++;
    if (filters.brandId) count++;
    if (filters.minProteinG != null) count++;
    if (filters.maxPriceINR != null) count++;
    if (filters.dietaryAttributeIds.length > 0) count++;
    if (filters.occasionId) count++;
    if (filters.maxSugarG != null) count++;
    if (filters.maxCalories != null) count++;
    return count;
  }, [filters]);

  const update = (partial: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const reset = () => {
    onFiltersChange({ ...emptyFilters, query: filters.query });
  };

  const FilterContent = () => (
    <div className="space-y-5">
      {/* Category */}
      <div>
        <label className="ps-label">Category</label>
        <select
          className="ps-select"
          value={filters.categoryId ?? ''}
          onChange={(e) => update({ categoryId: e.target.value || null })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Brand */}
      <div>
        <label className="ps-label">Brand</label>
        <select
          className="ps-select"
          value={filters.brandId ?? ''}
          onChange={(e) => update({ brandId: e.target.value || null })}
        >
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Min Protein */}
      <div>
        <label className="ps-label">Min protein (g per serving)</label>
        <input
          type="number"
          min="0"
          step="1"
          className="ps-input"
          placeholder="Any"
          value={filters.minProteinG ?? ''}
          onChange={(e) => update({ minProteinG: e.target.value ? Number(e.target.value) : null })}
        />
      </div>

      {/* Max Price */}
      <div>
        <label className="ps-label">Max price (INR)</label>
        <input
          type="number"
          min="0"
          step="50"
          className="ps-input"
          placeholder="Any"
          value={filters.maxPriceINR ?? ''}
          onChange={(e) => update({ maxPriceINR: e.target.value ? Number(e.target.value) : null })}
        />
      </div>

      {/* Max Sugar */}
      <div>
        <label className="ps-label">Max sugar (g per serving)</label>
        <input
          type="number"
          min="0"
          step="1"
          className="ps-input"
          placeholder="Any"
          value={filters.maxSugarG ?? ''}
          onChange={(e) => update({ maxSugarG: e.target.value ? Number(e.target.value) : null })}
        />
      </div>

      {/* Max Calories */}
      <div>
        <label className="ps-label">Max calories (per serving)</label>
        <input
          type="number"
          min="0"
          step="10"
          className="ps-input"
          placeholder="Any"
          value={filters.maxCalories ?? ''}
          onChange={(e) => update({ maxCalories: e.target.value ? Number(e.target.value) : null })}
        />
      </div>

      {/* Occasion */}
      <div>
        <label className="ps-label">Occasion</label>
        <select
          className="ps-select"
          value={filters.occasionId ?? ''}
          onChange={(e) => update({ occasionId: e.target.value || null })}
        >
          <option value="">Any occasion</option>
          {occasions.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </div>

      {/* Dietary Attributes */}
      {dietaryAttributes.length > 0 && (
        <div>
          <label className="ps-label">Dietary requirements</label>
          <div className="space-y-2.5">
            {dietaryAttributes.map((d) => {
              const checked = filters.dietaryAttributeIds.includes(d.id);
              return (
                <label key={d.id} className="flex cursor-pointer items-center gap-2.5 text-sm text-aubergine">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const ids = e.target.checked
                        ? [...filters.dietaryAttributeIds, d.id]
                        : filters.dietaryAttributeIds.filter((id) => id !== d.id);
                      update({ dietaryAttributeIds: ids });
                    }}
                    className="h-4 w-4 rounded border-mist text-aubergine focus:ring-coral/20"
                  />
                  {d.name}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {activeFilterCount > 0 && (
        <button onClick={reset} className="ps-btn-ghost w-full text-gray-500 hover:text-gray-900">
          Clear all filters ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile filter toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="mb-1 flex min-h-11 items-center gap-2 self-start rounded-xl border border-mist bg-white px-4 py-2.5 text-sm font-semibold text-aubergine transition-colors hover:bg-lavender lg:hidden"
      >
        <SlidersHorizontal size={16} />
        Filters
        {activeFilterCount > 0 && (
          <span className="ps-badge bg-coral/20 text-aubergine">{activeFilterCount}</span>
        )}
      </button>

      {/* Mobile filter drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-aubergine/35" onClick={() => setMobileOpen(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby="mobile-filters-title" className="absolute right-0 top-0 h-full w-96 max-w-[92vw] overflow-y-auto bg-ivory p-5 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 id="mobile-filters-title" className="font-heading text-lg font-bold text-aubergine">Refine your shortlist</h2>
              <button onClick={() => setMobileOpen(false)} aria-label="Close filters" className="flex h-11 w-11 items-center justify-center rounded-xl text-aubergine hover:bg-lavender">
                <X size={20} />
              </button>
            </div>
            <FilterContent />
            <button
              onClick={() => setMobileOpen(false)}
              className="ps-btn-primary mt-6 w-full"
            >
              Show {resultCount} results
            </button>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <div className="ps-card sticky top-24 p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-aubergine">
              <SlidersHorizontal size={16} />
              Filters
            </h2>
            {activeFilterCount > 0 && (
              <span className="ps-badge bg-coral/20 text-aubergine">{activeFilterCount} active</span>
            )}
          </div>
          <FilterContent />
        </div>
      </aside>
    </>
  );
}
