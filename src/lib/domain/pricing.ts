import type { Modality } from "./types";

/** Total sugerido de un lote en USD, redondeado a centavos. Solo la venta tiene precio. */
export function suggestedTotal(kg: number, pricePerKg: number, modality: Modality): number {
  if (modality !== "venta") return 0;
  return Math.round(kg * pricePerKg * 100) / 100;
}
