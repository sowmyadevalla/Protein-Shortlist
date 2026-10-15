import type { ReactNode } from 'react';
import { Navbar } from '@/components/Navbar';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-5 sm:px-6 md:pb-10 md:pt-8 lg:px-8">
        {children}
      </main>
      <footer className="border-t border-mist bg-ivory">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 font-heading text-sm font-bold text-aubergine">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-aubergine text-white">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              Protein Shortlist
            </div>
            <p className="max-w-2xl text-xs leading-relaxed text-slate">
              Shortlist, don&apos;t scroll. Product data from Open Food Facts (ODbL).
              Prices from authorized retailer feeds only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
