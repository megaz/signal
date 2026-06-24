/** Compact number formatting: 512133 → "512.1k", 6.2e6 → "6.2M". */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
  return String(Math.round(n));
}

/** Short date for chart axes: 2026-06-24 → "6/24". */
export function shortDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
