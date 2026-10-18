import { describe, expect, test } from "vitest";

import { myLotStatusLabel, sortMyLots, type MyLot } from "./status";

const now = new Date("2026-10-20T15:00:00Z"); // 20 oct, 9:00 en El Salvador

function lot(over: Partial<MyLot> & { collectorName?: string; confirmedKg?: number }): MyLot {
  const { collectorName = "Don José", confirmedKg = null, ...rest } = over;
  return {
    id: "l1",
    polymerCode: "PET",
    estimatedKg: 40,
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
            confirmedKg,
            totalAmount: null,
            certificateCode: null,
            completedAt: null,
            myRatingGiven: false,
          }
        : null,
    ...rest,
  };
}

describe("myLotStatusLabel", () => {
  test("describe cada estado en palabras del comercio", () => {
    expect(myLotStatusLabel(lot({ status: "publicado" }), now)).toBe("Esperando reciclador");
    expect(myLotStatusLabel(lot({ status: "reservado" }), now)).toBe("Don José reservó tu lote: pasa mañana 9:00–11:00");
    expect(myLotStatusLabel(lot({ status: "entregado" }), now)).toBe("Entregado, esperando la confirmación de kg");
    expect(myLotStatusLabel(lot({ status: "completado", confirmedKg: 35.5 }), now)).toBe("35.5 kg confirmados");
  });
});

describe("sortMyLots", () => {
  test("primero lo que pide acción (reservado), luego entregado, publicado y completados recientes", () => {
    const ids = sortMyLots([
      lot({ id: "pub", status: "publicado" }),
      lot({ id: "comp", status: "completado", confirmedKg: 10 }),
      lot({ id: "ent", status: "entregado" }),
      lot({ id: "res", status: "reservado" }),
    ]).map((l) => l.id);
    expect(ids).toEqual(["res", "ent", "pub", "comp"]);
  });
});
