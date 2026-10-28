import { describe, expect, test } from "vitest";

import { eventFromQueueRow } from "./types";

const LOT = "11111111-1111-4111-8111-111111111111";
const PICKUP = "22222222-2222-4222-8222-222222222222";

describe("eventFromQueueRow", () => {
  test("lote_cercano: pasa el payload a camelCase", () => {
    const event = eventFromQueueRow("lote_cercano", {
      lot_id: LOT,
      polymer_code: "PET",
      estimated_lb: 100,
      generator_name: "Comedor La Ceiba",
      distance_m: 1500,
    });
    expect(event).toEqual({
      type: "lote_cercano",
      lotId: LOT,
      polymerCode: "PET",
      estimatedLb: 100,
      generatorName: "Comedor La Ceiba",
      distanceM: 1500,
    });
  });

  test("lote_cercano: la distancia y el nombre pueden faltar (la base los deja en null)", () => {
    const event = eventFromQueueRow("lote_cercano", {
      lot_id: LOT,
      polymer_code: "HDPE",
      estimated_lb: 40.5,
      generator_name: null,
      distance_m: null,
    });
    expect(event).toMatchObject({ type: "lote_cercano", generatorName: null, distanceM: null, estimatedLb: 40.5 });
  });

  test("lote_reservado, entrega_propuesta y entrega_confirmada", () => {
    expect(
      eventFromQueueRow("lote_reservado", { lot_id: LOT, pickup_id: PICKUP, polymer_code: "PP", estimated_lb: 60 }),
    ).toEqual({ type: "lote_reservado", lotId: LOT, pickupId: PICKUP, polymerCode: "PP", estimatedLb: 60 });

    expect(eventFromQueueRow("entrega_propuesta", { pickup_id: PICKUP, lot_id: LOT, proposed_lb: 95.5 })).toEqual({
      type: "entrega_propuesta",
      pickupId: PICKUP,
      lotId: LOT,
      proposedLb: 95.5,
    });

    expect(
      eventFromQueueRow("entrega_confirmada", {
        pickup_id: PICKUP,
        lot_id: LOT,
        confirmed_lb: 98,
        voucher_code: "RCA-2026-0A1B2C",
      }),
    ).toEqual({ type: "entrega_confirmada", pickupId: PICKUP, lotId: LOT, confirmedLb: 98, voucherCode: "RCA-2026-0A1B2C" });
  });

  test("reserva_liberada acepta solo los tres motivos que manda la base", () => {
    for (const reason of ["generador", "reciclador", "automatica"] as const) {
      expect(eventFromQueueRow("reserva_liberada", { lot_id: LOT, reason })).toEqual({
        type: "reserva_liberada",
        lotId: LOT,
        reason,
      });
    }
    expect(eventFromQueueRow("reserva_liberada", { lot_id: LOT, reason: "otro" })).toBeNull();
    expect(eventFromQueueRow("reserva_liberada", { lot_id: LOT })).toBeNull();
  });

  test("plan_activado no lleva datos", () => {
    expect(eventFromQueueRow("plan_activado", {})).toEqual({ type: "plan_activado" });
  });

  test("evento desconocido: null", () => {
    expect(eventFromQueueRow("algo_raro", { lot_id: LOT })).toBeNull();
    expect(eventFromQueueRow("", {})).toBeNull();
  });

  test("payload que no es un objeto: null", () => {
    expect(eventFromQueueRow("lote_cercano", null)).toBeNull();
    expect(eventFromQueueRow("lote_cercano", "texto")).toBeNull();
    expect(eventFromQueueRow("lote_cercano", 5)).toBeNull();
    expect(eventFromQueueRow("lote_cercano", [LOT])).toBeNull();
  });

  test("faltan campos o vienen del tipo equivocado: null", () => {
    expect(eventFromQueueRow("lote_cercano", { polymer_code: "PET", estimated_lb: 100 })).toBeNull();
    expect(eventFromQueueRow("lote_cercano", { lot_id: LOT, polymer_code: "PET" })).toBeNull();
    expect(eventFromQueueRow("lote_cercano", { lot_id: LOT, polymer_code: "PET", estimated_lb: "100" })).toBeNull();
    expect(eventFromQueueRow("lote_cercano", { lot_id: "", polymer_code: "PET", estimated_lb: 100 })).toBeNull();
    expect(eventFromQueueRow("lote_cercano", { lot_id: LOT, polymer_code: "PET", estimated_lb: Number.NaN })).toBeNull();
    expect(eventFromQueueRow("lote_reservado", { lot_id: LOT, polymer_code: "PET", estimated_lb: 10 })).toBeNull();
    expect(eventFromQueueRow("entrega_propuesta", { pickup_id: PICKUP, lot_id: LOT })).toBeNull();
    expect(eventFromQueueRow("entrega_confirmada", { pickup_id: PICKUP, lot_id: LOT, confirmed_lb: 10 })).toBeNull();
  });
});
