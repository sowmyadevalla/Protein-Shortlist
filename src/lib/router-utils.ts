import { useRouter, parsePath } from '@/lib/router';

// Extract route params from the current path.
// For /products/:id, call useParams('id') which returns the second segment.
export function useParams(paramName?: string): Record<string, string | undefined> & { id?: string } {
  const { path } = useRouter();
  const { segments } = parsePath(path);
  // Common patterns:
  // /products/:id → segments = ['products', 'abc']
  if (segments.length >= 2) {
    return { id: segments[1], [segments[0]]: segments[1] } as Record<string, string | undefined> & { id?: string };
  }
  return {} as Record<string, string | undefined> & { id?: string };
}
