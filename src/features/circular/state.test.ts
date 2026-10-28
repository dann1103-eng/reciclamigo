import { describe, expect, test } from "vitest";

import { circularCardState, deliveriesLabel, formatLongDate } from "./state";

const now = new Date("2026-10-28T12:00:00Z");
const free = { active: false, expiresAt: null };
const active = { active: true, expiresAt: "2026-11-20T00:00:00Z" };
const expired = { active: false, expiresAt: "2026-10-01T00:00:00Z" };

describe("circularCardState", () => {
  test("sin entregas confirmadas: todavía no hay insignia, con o sin plan", () => {
    expect(circularCardState({ deliveries: 0, plan: free, now })).toEqual({ kind: "sin-entregas" });
    expect(circularCardState({ deliveries: 0, plan: active, now })).toEqual({ kind: "sin-entregas" });
  });

  test("con entregas y sin plan: insignia básica", () => {
    expect(circularCardState({ deliveries: 2, plan: free, now })).toEqual({ kind: "basica", planExpiredAt: null });
  });

  test("con entregas y plan vigente: página pública con QR", () => {
    expect(circularCardState({ deliveries: 2, plan: active, now })).toEqual({ kind: "publica" });
    expect(circularCardState({ deliveries: 2, plan: { active: true, expiresAt: null }, now })).toEqual({ kind: "publica" });
  });

  test("con entregas y plan vencido: insignia básica y avisa cuándo venció", () => {
    expect(circularCardState({ deliveries: 2, plan: expired, now })).toEqual({
      kind: "basica",
      planExpiredAt: "2026-10-01T00:00:00Z",
    });
  });

  test("un plan que aún no empieza no cuenta como vencido", () => {
    expect(circularCardState({ deliveries: 2, plan: { active: false, expiresAt: "2026-12-01T00:00:00Z" }, now })).toEqual({
      kind: "basica",
      planExpiredAt: null,
    });
  });
});

describe("deliveriesLabel", () => {
  test("singular y plural", () => {
    expect(deliveriesLabel(1)).toBe("entrega confirmada");
    expect(deliveriesLabel(0)).toBe("entregas confirmadas");
    expect(deliveriesLabel(7)).toBe("entregas confirmadas");
  });
});

describe("formatLongDate", () => {
  test("fecha larga en hora de El Salvador", () => {
    // 01:00 UTC del 21 de octubre todavía es 20 de octubre en El Salvador (UTC-6).
    expect(formatLongDate("2026-10-21T01:00:00Z")).toBe("20 de octubre de 2026");
    expect(formatLongDate("2026-10-20T15:00:00Z")).toBe("20 de octubre de 2026");
  });
});
