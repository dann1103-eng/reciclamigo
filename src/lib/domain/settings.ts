import type { Json } from "@/types/database";

import { normalizeSvPhone } from "./phone";
import type { PolymerCode } from "./polymers";

/** Valores del negocio que el administrador edita en app_settings. Nada de esto va escrito a mano en el código. */
export type AppSettings = {
  planPriceUsd: number;
  freeLotsPerMonth: number;
  freeHistoryDays: number;
  commissionPct: number;
  /** USD por libra; null = sin precio de referencia (LDPE, PP y PS al inicio). */
  refPriceUsdPerLb: Record<PolymerCode, number | null>;
  alertRadiiKm: number[];
  extraPlanRadiusKm: number;
  releaseHours: number;
  co2Factor: number;
  /** null = sin tope. */
  pointsMonthlyCap: number | null;
  pointsExpiryDays: number;
  pointsPerLb: number;
  planDurationDays: number;
  contactWhatsapp: string | null;
};

type Row = { key: string; value: Json };

export function parseSettings(rows: Row[]): AppSettings {
  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  const raw = (key: string): Json => {
    if (!byKey.has(key)) throw new Error(`Falta el ajuste "${key}" en la configuración`);
    return byKey.get(key) as Json;
  };
  const num = (key: string): number => {
    const v = raw(key);
    if (typeof v !== "number") throw new Error(`El ajuste "${key}" debe ser un número`);
    return v;
  };
  const numOrNull = (key: string): number | null => {
    const v = raw(key);
    if (v === null) return null;
    if (typeof v !== "number") throw new Error(`El ajuste "${key}" debe ser un número o quedar vacío`);
    return v;
  };
  const numList = (key: string): number[] => {
    const v = raw(key);
    if (!Array.isArray(v) || v.some((x) => typeof x !== "number")) {
      throw new Error(`El ajuste "${key}" debe ser una lista de números`);
    }
    return v as number[];
  };
  const text = (key: string): string | null => {
    const v = raw(key);
    if (v === null) return null;
    if (typeof v !== "string") throw new Error(`El ajuste "${key}" debe ser texto o quedar vacío`);
    return v;
  };

  return {
    planPriceUsd: num("plan_trazabilidad_precio_usd"),
    freeLotsPerMonth: num("lotes_gratis_por_mes"),
    freeHistoryDays: num("historial_gratis_dias"),
    commissionPct: num("comision_volumen_pct"),
    refPriceUsdPerLb: {
      PET: numOrNull("precio_ref_pet_usd_lb"),
      HDPE: numOrNull("precio_ref_hdpe_usd_lb"),
      LDPE: numOrNull("precio_ref_ldpe_usd_lb"),
      PP: numOrNull("precio_ref_pp_usd_lb"),
      PS: numOrNull("precio_ref_ps_usd_lb"),
    },
    alertRadiiKm: numList("radios_aviso_km"),
    extraPlanRadiusKm: num("radio_extra_plan_km"),
    releaseHours: num("horas_liberar_reserva"),
    co2Factor: num("factor_co2_mixto"),
    pointsMonthlyCap: numOrNull("reciclapuntos_tope_mensual"),
    pointsExpiryDays: num("reciclapuntos_caducidad_dias"),
    pointsPerLb: num("reciclapuntos_por_lb"),
    planDurationDays: num("plan_duracion_dias"),
    contactWhatsapp: normalizeSvPhone(text("contacto_whatsapp_reciclamigo")),
  };
}
