// Factores de la propuesta: 180 t desviadas → 360 tCO2e evitadas y 540 m³ de vertedero.
export const CO2E_KG_PER_KG = 2;
export const LANDFILL_M3_PER_TONNE = 3;

export function co2eAvoidedKg(kg: number): number {
  return kg * CO2E_KG_PER_KG;
}

export function landfillM3Freed(kg: number): number {
  return (kg / 1000) * LANDFILL_M3_PER_TONNE;
}
