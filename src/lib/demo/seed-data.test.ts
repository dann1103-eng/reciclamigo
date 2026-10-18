import { describe, expect, test } from "vitest";

import { buildSeedData, type SeedData } from "./seed-data";

const NOW = new Date("2026-10-20T15:00:00Z");
const PRICES = { PET: 0.2, HDPE: 0.18, LDPE: 0.1, PP: 0.15, PS: 0.05 };

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const data: SeedData = buildSeedData(NOW, PRICES);
const person = (key: string) => data.people.find((p) => p.key === key)!;
const demo = (role: string) => data.people.find((p) => p.demo === role)!;
const completed = data.pickups.filter((p) => p.completedAt);

describe("buildSeedData", () => {
  test("es reproducible", () => {
    expect(buildSeedData(NOW, PRICES)).toEqual(data);
  });

  test("tiene las tres cuentas demo con los roles correctos", () => {
    expect(demo("comercio")).toMatchObject({ role: "generador", displayName: "Comedor La Ceiba", municipality: "Santa Ana" });
    expect(demo("reciclador")).toMatchObject({ role: "valorizador", displayName: "Don José", verified: true });
    expect(demo("alcaldia")).toMatchObject({ role: "municipalidad", displayName: "Alcaldía de Santa Ana" });
  });

  test("reparte ~12 comercios y ~8 recicladores entre Santa Ana y San Salvador", () => {
    const gens = data.people.filter((p) => p.role === "generador");
    const cols = data.people.filter((p) => p.role === "valorizador");
    expect(gens.length).toBeGreaterThanOrEqual(12);
    expect(cols.length).toBeGreaterThanOrEqual(8);
    const santaAna = [...gens, ...cols].filter((p) => p.municipality === "Santa Ana").length;
    expect(santaAna / (gens.length + cols.length)).toBeGreaterThanOrEqual(0.55);
    expect(new Set(data.people.map((p) => p.email)).size).toBe(data.people.length);
    expect(data.people.filter((p) => p.whatsapp).every((p) => /^5037\d{7}$/.test(p.whatsapp!))).toBe(true);
  });

  test("los lotes publicados cubren los radios de 1, 3 y 5 km alrededor de Don José", () => {
    const jose = demo("reciclador");
    const published = data.lots.filter((l) => l.status === "publicado");
    const dist = published.map((l) => haversine(jose, person(l.generatorKey)));
    expect(published.length).toBeGreaterThanOrEqual(18);
    expect(dist.filter((d) => d <= 3000).length).toBeGreaterThanOrEqual(8);
    expect(dist.filter((d) => d <= 1000).length).toBeGreaterThanOrEqual(2);
    expect(dist.filter((d) => d > 1000 && d <= 3000).length).toBeGreaterThanOrEqual(2);
    expect(dist.filter((d) => d > 3000 && d <= 5000).length).toBeGreaterThanOrEqual(2);
    expect(published.every((l) => new Date(l.pickupFrom) > NOW && l.pickupTo > l.pickupFrom)).toBe(true);
  });

  test("~60 retiros completados en los 6 meses previos, con kg, precio y certificado coherentes", () => {
    expect(completed.length).toBeGreaterThanOrEqual(55);
    const sixMonthsAgo = new Date(NOW.getTime() - 183 * 86_400_000);
    for (const p of completed) {
      const lot = data.lots.find((l) => l.key === p.lotKey)!;
      expect(lot.status).toBe("completado");
      expect(new Date(p.completedAt!) < NOW && new Date(p.completedAt!) > sixMonthsAgo).toBe(true);
      expect(p.confirmedKg).toBeGreaterThanOrEqual(10);
      expect(p.confirmedKg).toBeLessThanOrEqual(300);
      expect(p.totalAmount).toBe(Math.round(p.confirmedKg! * lot.pricePerKg * 100) / 100);
      expect(lot.pricePerKg).toBe(lot.modality === "venta" ? PRICES[lot.polymerCode] : 0);
      expect(p.certificateCode).toMatch(/^RCA-\d{4}-[0-9A-F]{6}$/);
      expect(person(p.collectorKey).municipality).toBe(person(lot.generatorKey).municipality);
    }
    expect(new Set(completed.map((p) => p.certificateCode)).size).toBe(completed.length);
    const months = new Set(completed.map((p) => p.completedAt!.slice(0, 7)));
    expect(months.size).toBeGreaterThanOrEqual(6);
  });

  test("las cuentas demo tienen historial suficiente", () => {
    const lotsOf = (key: string) => data.lots.filter((l) => l.generatorKey === key).map((l) => l.key);
    const comercioLots = lotsOf(demo("comercio").key);
    expect(completed.filter((p) => comercioLots.includes(p.lotKey)).length).toBeGreaterThanOrEqual(6);
    expect(completed.filter((p) => p.collectorKey === demo("reciclador").key).length).toBeGreaterThanOrEqual(10);
  });

  test("cada retiro completado tiene calificación de ambas partes, mayoría 4 o 5 estrellas", () => {
    expect(data.ratings.length).toBe(completed.length * 2);
    const high = data.ratings.filter((r) => r.stars >= 4).length;
    expect(high / data.ratings.length).toBeGreaterThanOrEqual(0.8);
    for (const r of data.ratings) expect(r.raterKey).not.toBe(r.rateeKey);
  });

  test("nadie de la alcaldía participa en lotes ni retiros", () => {
    const mun = demo("alcaldia").key;
    expect(data.lots.some((l) => l.generatorKey === mun)).toBe(false);
    expect(data.pickups.some((p) => p.collectorKey === mun)).toBe(false);
  });
});
