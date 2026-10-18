import { describe, expect, test } from "vitest";

import { completePickupSchema, idSchema, parseKg, publishLotSchema, ratePickupSchema } from "./schemas";

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

  test("una coma seguida de grupos de 3 dígitos es separador de miles (convención de El Salvador)", () => {
    expect(parseKg("1,250")).toBe(1250);
    expect(parseKg("1,250.5")).toBe(1250.5);
    expect(parseKg("35,50")).toBe(35.5);
    expect(parseKg("1.250,5")).toBe(1250.5);
  });

  test("devuelve null si no es un número", () => {
    expect(parseKg("")).toBeNull();
    expect(parseKg("abc")).toBeNull();
    expect(parseKg("1.2.3")).toBeNull();
  });
});

describe("completePickupSchema", () => {
  const uuid = "8f14e45f-ceea-4e7a-9c4e-1f0a4e7d2b11";
  const ok = (v: object) => completePickupSchema.safeParse(v).success;

  test("acepta kg positivos y un método de pago conocido", () => {
    expect(ok({ pickupId: uuid, confirmedKg: 35.5, paymentMethod: "chivo_wallet" })).toBe(true);
    expect(ok({ pickupId: uuid, confirmedKg: 12, paymentMethod: "efectivo" })).toBe(true);
  });

  test("rechaza kg en cero, negativos o diminutos", () => {
    expect(ok({ pickupId: uuid, confirmedKg: 0, paymentMethod: "efectivo" })).toBe(false);
    expect(ok({ pickupId: uuid, confirmedKg: -3, paymentMethod: "efectivo" })).toBe(false);
    expect(ok({ pickupId: uuid, confirmedKg: 0.004, paymentMethod: "efectivo" })).toBe(false);
  });

  test("rechaza métodos de pago desconocidos y retiros sin id válido", () => {
    expect(ok({ pickupId: uuid, confirmedKg: 35.5, paymentMethod: "bitcoin" })).toBe(false);
    expect(ok({ pickupId: "abc", confirmedKg: 35.5, paymentMethod: "efectivo" })).toBe(false);
  });
});

describe("ratePickupSchema", () => {
  const pickupId = "8f14e45f-ceea-4e7a-9c4e-1f0a4e7d2b11";
  const ok = (v: object) => ratePickupSchema.safeParse({ pickupId, ...v }).success;

  test("acepta de 1 a 5 estrellas enteras, con o sin comentario", () => {
    expect(ok({ stars: 5 })).toBe(true);
    expect(ok({ stars: 1, comment: "Llegó tarde" })).toBe(true);
  });

  test("rechaza estrellas fuera de rango o con decimales y comentarios largos", () => {
    expect(ok({ stars: 0 })).toBe(false);
    expect(ok({ stars: 6 })).toBe(false);
    expect(ok({ stars: 2.5 })).toBe(false);
    expect(ok({ stars: 5, comment: "x".repeat(281) })).toBe(false);
  });
});

describe("idSchema", () => {
  test("solo acepta uuid (las acciones no mandan basura a la base)", () => {
    expect(idSchema.safeParse("8f14e45f-ceea-4e7a-9c4e-1f0a4e7d2b11").success).toBe(true);
    expect(idSchema.safeParse("abc").success).toBe(false);
    expect(idSchema.safeParse("").success).toBe(false);
  });
});
