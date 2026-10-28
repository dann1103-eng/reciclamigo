import { describe, expect, test } from "vitest";

import { freeLotsLeft, limitReached, planStatusFromRow, type PlanStatus } from "./plans";

const free: PlanStatus = {
  plan: "gratis",
  active: false,
  startedAt: null,
  expiresAt: null,
  requestedAt: null,
  publishedThisMonth: 3,
  freeLimit: 8,
};

describe("planStatusFromRow", () => {
  test("convierte la fila de plan_status()", () => {
    expect(
      planStatusFromRow({
        plan: "trazabilidad",
        active: true,
        started_at: "2026-10-01T00:00:00Z",
        expires_at: "2026-10-31T00:00:00Z",
        requested_at: null,
        published_this_month: 12,
        free_limit: 8,
      }),
    ).toEqual({
      plan: "trazabilidad",
      active: true,
      startedAt: "2026-10-01T00:00:00Z",
      expiresAt: "2026-10-31T00:00:00Z",
      requestedAt: null,
      publishedThisMonth: 12,
      freeLimit: 8,
    });
  });

  test("sin fila (ni comercio) devuelve el plan gratis vacío", () => {
    expect(planStatusFromRow(undefined)).toMatchObject({ plan: "gratis", active: false, publishedThisMonth: 0 });
  });
});

describe("límite de lotes gratis", () => {
  test("al comercio gratis le quedan 8 − publicados", () => {
    expect(freeLotsLeft(free)).toBe(5);
    expect(limitReached(free)).toBe(false);
  });

  test("el octavo lote es el último: el noveno ya no se puede", () => {
    expect(limitReached({ ...free, publishedThisMonth: 7 })).toBe(false);
    expect(limitReached({ ...free, publishedThisMonth: 8 })).toBe(true);
    expect(freeLotsLeft({ ...free, publishedThisMonth: 8 })).toBe(0);
    expect(freeLotsLeft({ ...free, publishedThisMonth: 11 })).toBe(0);
  });

  test("con plan activo no hay límite", () => {
    const paid = { ...free, plan: "trazabilidad" as const, active: true, publishedThisMonth: 40 };
    expect(freeLotsLeft(paid)).toBeNull();
    expect(limitReached(paid)).toBe(false);
  });

  test("si no hay límite configurado no se bloquea", () => {
    expect(limitReached({ ...free, freeLimit: null, publishedThisMonth: 99 })).toBe(false);
  });
});
