import type { ProfileImpactRow } from "@/lib/data/profile-impact";
import { co2AvoidedKg } from "@/lib/domain/units";

const num = (value: number | string | null | undefined) => (value === null || value === undefined ? 0 : Number(value));

export type ImpactFigures = {
  /** Libras entregadas y confirmadas. */
  lb: number;
  /** CO₂ evitado, en kg. */
  co2Kg: number;
  /** Dinero recibido por ventas confirmadas, en USD. */
  income: number;
  deliveries: number;
};

/** Las cifras del comercio salen de la vista profile_impact; el factor de CO₂ viene de la configuración. */
export function impactFigures(row: ProfileImpactRow | null, co2Factor: number): ImpactFigures {
  const lb = num(row?.completed_lb);
  return {
    lb,
    co2Kg: co2AvoidedKg(lb, co2Factor),
    income: num(row?.total_amount),
    deliveries: num(row?.completed_count),
  };
}
