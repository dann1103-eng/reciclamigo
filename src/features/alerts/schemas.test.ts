import { describe, expect, test } from "vitest";

import { alertPrefsSchema, endpointSchema, normalizePolymers, pushSubscriptionSchema } from "./schemas";

const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
  keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" },
};

describe("pushSubscriptionSchema", () => {
  test("acepta la suscripción que arma el navegador", () => {
    expect(pushSubscriptionSchema.safeParse(subscription).success).toBe(true);
  });

  test("rechaza un endpoint que no es https", () => {
    expect(pushSubscriptionSchema.safeParse({ ...subscription, endpoint: "http://push.example/abc" }).success).toBe(false);
    expect(pushSubscriptionSchema.safeParse({ ...subscription, endpoint: "no-es-url" }).success).toBe(false);
    expect(pushSubscriptionSchema.safeParse({ ...subscription, endpoint: "" }).success).toBe(false);
  });

  test("rechaza llaves que faltan o vacías", () => {
    expect(pushSubscriptionSchema.safeParse({ endpoint: subscription.endpoint }).success).toBe(false);
    expect(pushSubscriptionSchema.safeParse({ ...subscription, keys: { p256dh: "", auth: "x" } }).success).toBe(false);
    expect(pushSubscriptionSchema.safeParse({ ...subscription, keys: { p256dh: "x" } }).success).toBe(false);
  });

  test("rechaza valores absurdamente largos", () => {
    const largo = "a".repeat(3000);
    expect(pushSubscriptionSchema.safeParse({ ...subscription, endpoint: `https://push.example/${largo}` }).success).toBe(false);
    expect(pushSubscriptionSchema.safeParse({ ...subscription, keys: { ...subscription.keys, auth: largo } }).success).toBe(false);
  });
});

describe("endpointSchema", () => {
  test("solo urls https", () => {
    expect(endpointSchema.safeParse(subscription.endpoint).success).toBe(true);
    expect(endpointSchema.safeParse("http://push.example/abc").success).toBe(false);
    expect(endpointSchema.safeParse("").success).toBe(false);
  });
});

describe("alertPrefsSchema", () => {
  test("acepta radio entero, tipos y estado", () => {
    expect(alertPrefsSchema.safeParse({ radiusKm: 3, polymers: ["PET", "HDPE"], enabled: true }).success).toBe(true);
    expect(alertPrefsSchema.safeParse({ radiusKm: 5, polymers: null, enabled: false }).success).toBe(true);
  });

  test("el radio debe ser un entero positivo", () => {
    for (const radiusKm of [0, -1, 1.5, Number.NaN]) {
      expect(alertPrefsSchema.safeParse({ radiusKm, polymers: null, enabled: true }).success).toBe(false);
    }
  });

  test("sin tipos de plástico no se puede (null significa todos)", () => {
    const result = alertPrefsSchema.safeParse({ radiusKm: 3, polymers: [], enabled: true });
    expect(result.success).toBe(false);
    expect(!result.success && result.error.issues[0].message).toBe("Elige al menos un tipo de plástico");
  });

  test("rechaza tipos que no existen", () => {
    expect(alertPrefsSchema.safeParse({ radiusKm: 3, polymers: ["PVC"], enabled: true }).success).toBe(false);
  });

  test("enabled es obligatorio", () => {
    expect(alertPrefsSchema.safeParse({ radiusKm: 3, polymers: null }).success).toBe(false);
  });
});

describe("normalizePolymers", () => {
  test("los cinco tipos equivalen a 'todos' (null), así los tipos nuevos también llegan", () => {
    expect(normalizePolymers(["PET", "HDPE", "LDPE", "PP", "PS"])).toBeNull();
    expect(normalizePolymers(["PS", "PP", "LDPE", "HDPE", "PET", "PET"])).toBeNull();
  });

  test("una selección parcial se queda como está, sin repetidos", () => {
    expect(normalizePolymers(["HDPE", "PET", "HDPE"])).toEqual(["HDPE", "PET"]);
  });

  test("null sigue siendo null", () => {
    expect(normalizePolymers(null)).toBeNull();
  });
});
