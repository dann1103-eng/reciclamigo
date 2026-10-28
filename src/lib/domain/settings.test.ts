import { describe, expect, test } from "vitest";

import { parseSettings } from "./settings";

const rows = [
  { key: "plan_trazabilidad_precio_usd", value: 14.99 },
  { key: "lotes_gratis_por_mes", value: 8 },
  { key: "historial_gratis_dias", value: 30 },
  { key: "comision_volumen_pct", value: 3 },
  { key: "precio_ref_pet_usd_lb", value: 0.09 },
  { key: "precio_ref_hdpe_usd_lb", value: 0.08 },
  { key: "precio_ref_ldpe_usd_lb", value: null },
  { key: "precio_ref_pp_usd_lb", value: null },
  { key: "precio_ref_ps_usd_lb", value: null },
  { key: "radios_aviso_km", value: [1, 3, 5] },
  { key: "radio_extra_plan_km", value: 2 },
  { key: "horas_liberar_reserva", value: 24 },
  { key: "factor_co2_mixto", value: 2 },
  { key: "reciclapuntos_tope_mensual", value: 500 },
  { key: "reciclapuntos_caducidad_dias", value: 365 },
  { key: "reciclapuntos_por_lb", value: 1 },
  { key: "plan_duracion_dias", value: 30 },
  { key: "contacto_whatsapp_reciclamigo", value: null },
];

describe("parseSettings", () => {
  test("convierte las filas de app_settings en valores tipados", () => {
    expect(parseSettings(rows)).toEqual({
      planPriceUsd: 14.99,
      freeLotsPerMonth: 8,
      freeHistoryDays: 30,
      commissionPct: 3,
      refPriceUsdPerLb: { PET: 0.09, HDPE: 0.08, LDPE: null, PP: null, PS: null },
      alertRadiiKm: [1, 3, 5],
      extraPlanRadiusKm: 2,
      releaseHours: 24,
      co2Factor: 2,
      pointsMonthlyCap: 500,
      pointsExpiryDays: 365,
      pointsPerLb: 1,
      planDurationDays: 30,
      contactWhatsapp: null,
    });
  });

  test("si falta un ajuste avisa cuál, en vez de inventar un valor", () => {
    expect(() => parseSettings(rows.filter((r) => r.key !== "lotes_gratis_por_mes"))).toThrow(/lotes_gratis_por_mes/);
  });

  test("rechaza un tipo equivocado", () => {
    const bad = rows.map((r) => (r.key === "factor_co2_mixto" ? { ...r, value: "dos" } : r));
    expect(() => parseSettings(bad)).toThrow(/factor_co2_mixto/);
    const badRadii = rows.map((r) => (r.key === "radios_aviso_km" ? { ...r, value: [1, "tres"] } : r));
    expect(() => parseSettings(badRadii)).toThrow(/radios_aviso_km/);
  });

  test("el contacto de WhatsApp queda normalizado a +503", () => {
    const withContact = rows.map((r) => (r.key === "contacto_whatsapp_reciclamigo" ? { ...r, value: "7000-1234" } : r));
    expect(parseSettings(withContact).contactWhatsapp).toBe("50370001234");
  });

  test("sin tope mensual de puntos no hay tope", () => {
    const noCap = rows.map((r) => (r.key === "reciclapuntos_tope_mensual" ? { ...r, value: null } : r));
    expect(parseSettings(noCap).pointsMonthlyCap).toBeNull();
  });
});
