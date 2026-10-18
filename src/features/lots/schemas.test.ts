import { describe, expect, test } from "vitest";

import { parseKg, publishLotSchema } from "./schemas";

const valid = {
  polymerCode: "PET",
  estimatedKg: 40,
  pickupFrom: "2099-10-21T15:00:00.000Z",
  pickupTo: "2099-10-21T17:00:00.000Z",
  modality: "venta",
  photoUrls: ["https://abc.supabase.co/storage/v1/object/public/lot-photos/u/a.jpg"],
};

describe("publishLotSchema", () => {
  test("acepta un lote válido, con o sin notas", () => {
    expect(publishLotSchema.safeParse(valid).success).toBe(true);
    expect(publishLotSchema.safeParse({ ...valid, notes: "En costales" }).success).toBe(true);
  });

  test("rechaza kg fuera de rango, incluidos los que se redondearían a 0", () => {
    expect(publishLotSchema.safeParse({ ...valid, estimatedKg: 0 }).success).toBe(false);
    expect(publishLotSchema.safeParse({ ...valid, estimatedKg: 10001 }).success).toBe(false);
    expect(publishLotSchema.safeParse({ ...valid, estimatedKg: 0.004 }).success).toBe(false);
  });

  test("rechaza una ventana vacía, invertida o ya pasada", () => {
    expect(publishLotSchema.safeParse({ ...valid, pickupTo: valid.pickupFrom }).success).toBe(false);
    const past = publishLotSchema.safeParse({
      ...valid,
      pickupFrom: "2020-01-01T15:00:00.000Z",
      pickupTo: "2020-01-01T17:00:00.000Z",
    });
    expect(past.success).toBe(false);
    expect(past.error?.issues[0].message).toBe("La ventana de retiro ya pasó");
  });

  test("rechaza más de 3 fotos, URLs que no son https y notas largas", () => {
    expect(publishLotSchema.safeParse({ ...valid, photoUrls: Array(4).fill(valid.photoUrls[0]) }).success).toBe(false);
    expect(publishLotSchema.safeParse({ ...valid, photoUrls: ["javascript:alert(1)"] }).success).toBe(false);
    expect(publishLotSchema.safeParse({ ...valid, notes: "x".repeat(281) }).success).toBe(false);
  });

  test("rechaza polímeros y modalidades desconocidos", () => {
    expect(publishLotSchema.safeParse({ ...valid, polymerCode: "PVC" }).success).toBe(false);
    expect(publishLotSchema.safeParse({ ...valid, modality: "subasta" }).success).toBe(false);
  });
});

describe("parseKg", () => {
  test("acepta punto o coma decimal", () => {
    expect(parseKg("35.5")).toBe(35.5);
    expect(parseKg("35,5")).toBe(35.5);
    expect(parseKg(" 40 ")).toBe(40);
  });

  test("devuelve null si no es un número", () => {
    expect(parseKg("")).toBeNull();
    expect(parseKg("abc")).toBeNull();
    expect(parseKg("1.2.3")).toBeNull();
  });
});
