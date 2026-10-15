import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// ============================================================
// Minimal hash-based router (no external dependency)
// ============================================================

interface RouterContextValue {
  path: string;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

function getCurrentPath(): string {
  const hash = window.location.hash.slice(1);
  return hash || '/';
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(getCurrentPath());

  useEffect(() => {
    const handler = () => setPath(getCurrentPath());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = (to: string) => {
    window.location.hash = to;
  };

  return (
    <RouterContext.Provider value={{ path, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}

// Parse a path like /products/abc into segments
export function parsePath(path: string): { segments: string[] } {
  const clean = path.split('?')[0].replace(/^\//, '').replace(/\/$/, '');
  const segments = clean ? clean.split('/') : [];
  return { segments };
}

// Parse query string from path
export function parseQuery(path: string): URLSearchParams {
  const qIndex = path.indexOf('?');
  if (qIndex === -1) return new URLSearchParams();
  return new URLSearchParams(path.slice(qIndex + 1));
}
