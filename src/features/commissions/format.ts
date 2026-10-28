const pct = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 2 });

/** "3 %" */
export function formatPct(value: number): string {
  return `${pct.format(value)} %`;
}
