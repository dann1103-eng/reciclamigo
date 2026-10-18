import { describe, expect, test } from "vitest";

import { groupMyPickups, type MyPickup } from "./pickups";

const pickup = (id: string, status: MyPickup["status"], completedAt: string | null = null): MyPickup => ({
  id,
  lotId: `lot-${id}`,
  polymerCode: "PET",
  estimatedKg: 40,
  pricePerKg: 0.2,
  modality: "venta",
  status,
  pickupFrom: "2026-10-21T15:00:00Z",
  pickupTo: "2026-10-21T17:00:00Z",
  generatorId: "g1",
  generatorName: "Comedor La Ceiba",
  generatorWhatsapp: null,
  confirmedKg: null,
  totalAmount: null,
  certificateCode: null,
  completedAt,
  myRatingGiven: false,
});

describe("groupMyPickups", () => {
  test("separa por recoger, listos para confirmar y completados recientes", () => {
    const now = new Date("2026-10-20T15:00:00Z");
    const groups = groupMyPickups(
      [
        pickup("a", "reservado"),
        pickup("b", "entregado"),
        pickup("c", "completado", "2026-10-19T15:00:00Z"),
        pickup("d", "completado", "2026-08-01T15:00:00Z"), // más de 30 días
        pickup("e", "completado", "2026-10-20T14:00:00Z"),
      ],
      now,
    );
    expect(groups.toCollect.map((p) => p.id)).toEqual(["a"]);
    expect(groups.toConfirm.map((p) => p.id)).toEqual(["b"]);
    expect(groups.completed.map((p) => p.id)).toEqual(["e", "c"]);
  });
});
