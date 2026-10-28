// En El Salvador todos usan libras. Todo peso se captura, guarda y muestra en libras (lb).
// Los quintales (1 qq = 100 lb) aparecen desde 100 lb. El kilo solo sirve para reportes
// ambientales (CO₂) y para quien reporta en sistema métrico.

export const LB_PER_KG = 2.20462;
export const KG_PER_LB = 0.45359237;
export const LB_PER_QUINTAL = 100;

// Factor de la propuesta: 3 m³ de vertedero liberados por tonelada desviada.
const LANDFILL_M3_PER_TONNE = 3;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const kgToLb = (kg: number): number => round2(kg * LB_PER_KG);
export const lbToKg = (lb: number): number => round2(lb * KG_PER_LB);
export const lbToQuintales = (lb: number): number => lb / LB_PER_QUINTAL;

const formatter = (maxDecimals: number) => new Intl.NumberFormat("es-SV", { maximumFractionDigits: maxDecimals });
const oneDecimal = formatter(1);
const twoDecimals = formatter(2);

/** "40 lb"; desde 100 lb también en quintales: "250 lb (2.5 qq)". */
export function formatLb(lb: number, maxDecimals = 1): string {
  const base = `${formatter(maxDecimals).format(lb)} lb`;
  return lb >= LB_PER_QUINTAL ? `${base} (${oneDecimal.format(lbToQuintales(lb))} qq)` : base;
}

export function formatKg(kg: number): string {
  return `${oneDecimal.format(kg)} kg`;
}

/** Para reportes: libras y, entre paréntesis, el equivalente en kg ("100 lb (45.4 kg)"). */
export function formatLbKg(lb: number, maxDecimals = 1): string {
  return `${formatter(maxDecimals).format(lb)} lb (${oneDecimal.format(lb * KG_PER_LB)} kg)`;
}

/** CO₂ evitado: el factor es masa a masa (kg de CO₂ por kg de plástico), así que se pasa la masa en kg. */
export function co2AvoidedKg(lb: number, factor: number): number {
  return lb * KG_PER_LB * factor;
}

/** kg bajo 1,000; toneladas desde ahí. */
export function formatCo2(kg: number): string {
  return kg >= 1000 ? `${twoDecimals.format(kg / 1000)} t` : `${oneDecimal.format(kg)} kg`;
}

export function landfillM3Freed(lb: number): number {
  return ((lb * KG_PER_LB) / 1000) * LANDFILL_M3_PER_TONNE;
}
