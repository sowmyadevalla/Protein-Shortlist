// Formatting helpers for displaying nullable numeric values

export function formatINR(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatGrams(value: number | null | undefined, suffix = 'g'): string {
  if (value == null) return '—';
  return `${value}${suffix}`;
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value == null) return '—';
  return value.toFixed(decimals);
}

export function formatProteinPer100g(protein: number | null | undefined): string {
  if (protein == null) return '—';
  return `${protein.toFixed(1)}g`;
}

export function isValidRetailerUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.length > 0;
  } catch {
    return false;
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
