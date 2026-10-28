import type { Modality } from "./types";

/** Total sugerido de un lote en USD (libras × precio por libra), redondeado a centavos. Solo la venta tiene precio. */
export function suggestedTotal(lb: number, pricePerLb: number, modality: Modality): number {
  if (modality !== "venta") return 0;
  return Math.round(lb * pricePerLb * 100) / 100;
}
