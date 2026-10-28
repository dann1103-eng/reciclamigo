import { describe, expect, test } from "vitest";

import { planState, sortPlanRows, type AdminPlanRow } from "./plan-list";

const now = new Date("2026-10-28T18:00:00Z");

const base: Omit<AdminPlanRow, "profileId" | "name"> = {
  orgType: "Restaurante",
  municipality: "Santa Ana",
  plan: null,
  startedAt: null,
  expiresAt: null,
  requestedAt: null,
};

describe("planState", () => {
  test("sin fila de plan es gratis", () => {
    expect(planState({ plan: null, startedAt: null, expiresAt: null }, now)).toBe("gratis");
  });

  test("Trazabilidad con vencimiento futuro está activo", () => {
    expect(planState({ plan: "trazabilidad", startedAt: "2026-10-01T00:00:00Z", expiresAt: "2026-11-27T05:59:59Z" }, now)).toBe("activo");
  });

  test("Trazabilidad sin vencimiento está activo", () => {
    expect(planState({ plan: "trazabilidad", startedAt: null, expiresAt: null }, now)).toBe("activo");
  });

  test("Trazabilidad con vencimiento pasado está vencido", () => {
    expect(planState({ plan: "trazabilidad", startedAt: "2026-08-01T00:00:00Z", expiresAt: "2026-09-30T05:59:59Z" }, now)).toBe("vencido");
  });

  test("Trazabilidad que todavía no empieza no cuenta como activo (igual que has_active_plan)", () => {
    expect(planState({ plan: "trazabilidad", startedAt: "2026-11-01T00:00:00Z", expiresAt: "2026-12-01T00:00:00Z" }, now)).toBe("gratis");
  });

  test("un plan desactivado a mano (gratis con vencimiento pasado) es gratis", () => {
    expect(planState({ plan: "gratis", startedAt: null, expiresAt: "2026-10-20T00:00:00Z" }, now)).toBe("gratis");
  });
});

describe("sortPlanRows", () => {
  const rows: AdminPlanRow[] = [
    { ...base, profileId: "1", name: "Zapatería" },
    { ...base, profileId: "2", name: "Hotel Sol", plan: "trazabilidad", expiresAt: "2026-11-20T00:00:00Z" },
    { ...base, profileId: "3", name: "Comedor Ceiba", requestedAt: "2026-10-27T10:00:00Z" },
    { ...base, profileId: "4", name: "Bar Luna", plan: "trazabilidad", expiresAt: "2026-09-01T00:00:00Z" },
    { ...base, profileId: "5", name: "Café Norte", requestedAt: "2026-10-25T10:00:00Z" },
    { ...base, profileId: "6", name: "Abarrotes", plan: "trazabilidad", expiresAt: "2026-11-02T00:00:00Z" },
  ];

  test("primero los que pidieron activación (el que lleva más tiempo esperando va arriba)", () => {
    const sorted = sortPlanRows(rows, now);
    expect(sorted.slice(0, 2).map((r) => r.profileId)).toEqual(["5", "3"]);
  });

  test("luego activos (el que vence antes primero), vencidos y gratis por nombre", () => {
    const sorted = sortPlanRows(rows, now);
    expect(sorted.slice(2).map((r) => r.profileId)).toEqual(["6", "2", "4", "1"]);
  });

  test("no cambia la lista original", () => {
    const copy = [...rows];
    sortPlanRows(rows, now);
    expect(rows).toEqual(copy);
  });
});
