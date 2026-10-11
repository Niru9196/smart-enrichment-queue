const number = new Intl.NumberFormat('en-US');
const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export const formatNumber = (n: number | null) => (n === null ? 'n/a' : number.format(n));
export const formatUsd = (n: number | null) => (n === null ? 'n/a' : usd.format(n));
export const formatPercent = (n: number) => `${Math.round(n * 100)}%`;

export function formatLocation(c: {
  city: string | null;
  state: string | null;
  country: string | null;
}) {
  const parts = [c.city, c.state].filter(Boolean).join(', ');
  if (!c.country) return parts || 'n/a';
  return parts ? `${parts} · ${c.country}` : c.country;
}

export const REVENUE_SOURCE_LABELS: Record<string, string> = {
  ai_estimate: 'AI estimate',
  public_filing: 'Public filing',
};

export const SOURCE_LABELS: Record<string, string> = {
  synthetic_demo_seed: 'Synthetic demo data',
};
