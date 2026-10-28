import { describe, expect, test } from "vitest";

import { myLotStatusLabel, sortMyLots, type MyLot } from "./status";

const now = new Date("2026-10-20T15:00:00Z"); // 20 oct, 9:00 en El Salvador

function lot(over: Partial<MyLot> & { collectorName?: string; confirmedLb?: number; proposedLb?: number }): MyLot {
  const { collectorName = "Don José", confirmedLb = null, proposedLb = null, ...rest } = over;
  return {
    id: "l1",
    polymerCode: "PET",
    estimatedLb: 88,
    pricePerLb: 0.09,
    modality: "venta",
    status: "publicado",
    pickupFrom: "2026-10-21T15:00:00Z", // 21 oct 9:00 SV
    pickupTo: "2026-10-21T17:00:00Z",
    createdAt: "2026-10-19T15:00:00Z",
    pickup:
      rest.status && rest.status !== "publicado"
        ? {
            id: "p1",
            collectorId: "c1",
            collectorName,
            collectorWhatsapp: null,
            proposedLb,
            proposedPricePerLb: proposedLb ? 0.09 : null,
            confirmedLb,
            totalAmount: null,
            voucherCode: null,
            completedAt: null,
            myRatingGiven: false,
            myRating: null,
          }
        : null,
    ...rest,
  };
}

describe("myLotStatusLabel", () => {
  test("describe cada estado en palabras del comercio", () => {
    expect(myLotStatusLabel(lot({ status: "publicado" }), now)).toBe("Esperando reciclador");
    expect(myLotStatusLabel(lot({ status: "reservado" }), now)).toBe("Don José reservó tu lote: pasa mañana 9:00–11:00");
    expect(myLotStatusLabel(lot({ status: "completado", confirmedLb: 78.26 }), now)).toBe("78.26 lb confirmadas");
  });

  test("entregado explica que falta que el reciclador acepte o corrija lo que registró el comercio", () => {
    expect(myLotStatusLabel(lot({ status: "entregado", proposedLb: 100 }), now)).toBe(
      "Registraste 100 lb (1 qq). Esperando que Don José acepte o corrija",
    );
  });

  test("los quintales aparecen desde 100 lb", () => {
    expect(myLotStatusLabel(lot({ status: "completado", confirmedLb: 250 }), now)).toBe("250 lb (2.5 qq) confirmadas");
  });
});

describe("sortMyLots", () => {
  test("primero lo que pide acción (reservado), luego entregado, publicado y completados recientes", () => {
    const ids = sortMyLots([
      lot({ id: "pub", status: "publicado" }),
      lot({ id: "comp", status: "completado", confirmedLb: 10 }),
      lot({ id: "ent", status: "entregado" }),
      lot({ id: "res", status: "reservado" }),
    ]).map((l) => l.id);
    expect(ids).toEqual(["res", "ent", "pub", "comp"]);
  });
});
