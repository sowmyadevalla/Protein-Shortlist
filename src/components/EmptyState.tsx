import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-mist bg-white px-6 py-16 text-center sm:py-20">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-lavender text-aubergine">
        {icon ?? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <h3 className="mb-2 font-heading text-xl font-bold text-aubergine">{title}</h3>
      <p className="mb-7 max-w-sm text-sm leading-relaxed text-slate">{description}</p>
      {action}
    </div>
  );
}
