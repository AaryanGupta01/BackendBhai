/** Returns a high-contrast CSS color string based on duration for dark backgrounds */
export function durColor(d: number): string {
  if (d < 100) return '#4ade80';  // fast green
  if (d < 500) return '#38bdf8';  // normal blue
  if (d < 2000) return '#fbbf24'; // warning amber
  return '#f87171';               // slow red
}

/** Returns a CSS class name suffix for status codes */
export function statusClass(s: number): string {
  if (s >= 500) return 's5xx';
  if (s >= 400) return 's4xx';
  return 's2xx';
}

/** Returns the method class suffix for CSS (handles DELETE/PATCH) */
export function methodClass(m: string): string {
  return m.charAt(0) + m.slice(1).toLowerCase().replace('elete', 'ELETE').replace('atch', 'ATCH');
}
