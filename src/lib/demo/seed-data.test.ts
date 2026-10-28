import { describe, expect, test } from "vitest";

import { buildSeedData, type SeedData } from "./seed-data";

const NOW = new Date("2026-10-20T15:00:00Z");
// Precios de referencia de la configuración: LDPE, PP y PS no tienen valor al inicio.
const PRICES = { PET: 0.09, HDPE: 0.08, LDPE: null, PP: null, PS: null };

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

  test("tiene las cuatro cuentas demo con los roles correctos", () => {
    expect(demo("comercio")).toMatchObject({ role: "generador", displayName: "Comedor La Ceiba", municipality: "Santa Ana", plan: true });
    expect(demo("reciclador")).toMatchObject({ role: "valorizador", displayName: "Don José", verified: true, tipoValorizador: "base" });
    expect(demo("alcaldia")).toMatchObject({ role: "municipalidad", displayName: "Alcaldía de Santa Ana" });
    expect(demo("admin")).toMatchObject({ role: "administrador", displayName: "Equipo Reciclamigo" });
  });

  test("solo los recicladores tienen tipo: centros de acopio y transformadores son de volumen", () => {
    const valorizadores = data.people.filter((p) => p.role === "valorizador");
    expect(valorizadores.every((p) => p.tipoValorizador !== null)).toBe(true);
    expect(data.people.filter((p) => p.role !== "valorizador").every((p) => p.tipoValorizador === null)).toBe(true);
    expect(person("acopio-el-progreso").tipoValorizador).toBe("volumen");
    expect(person("recuperadora-metropolitana").tipoValorizador).toBe("volumen");
    expect(person("dona-marta").tipoValorizador).toBe("base");
    expect(valorizadores.some((p) => p.tipoValorizador === "base")).toBe(true);
    expect(valorizadores.some((p) => p.tipoValorizador === "volumen")).toBe(true);
  });

  test("solo algunos comercios tienen plan, para poder mostrar los dos lados", () => {
    const withPlan = data.people.filter((p) => p.plan);
    const generators = data.people.filter((p) => p.role === "generador");
    expect(withPlan.length).toBeGreaterThanOrEqual(2);
    expect(withPlan.length).toBeLessThan(generators.length);
    expect(withPlan.every((p) => p.role === "generador")).toBe(true);
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

  test("~60 retiros completados en los 6 meses previos, con libras, precio y comprobante coherentes", () => {
    expect(completed.length).toBeGreaterThanOrEqual(55);
    const sixMonthsAgo = new Date(NOW.getTime() - 183 * 86_400_000);
    for (const p of completed) {
      const lot = data.lots.find((l) => l.key === p.lotKey)!;
      expect(lot.status).toBe("completado");
      expect(new Date(p.completedAt!) < NOW && new Date(p.completedAt!) > sixMonthsAgo).toBe(true);
      expect(p.confirmedLb).toBeGreaterThanOrEqual(22);
      expect(p.confirmedLb).toBeLessThanOrEqual(662);
      expect(p.proposedLb).toBe(p.confirmedLb);
      expect(p.totalAmount).toBe(Math.round(p.confirmedLb! * lot.pricePerLb * 100) / 100);
      expect(lot.pricePerLb).toBe(lot.modality === "venta" ? (PRICES[lot.polymerCode] ?? 0) : 0);
      expect(p.finalPricePerLb).toBe(lot.pricePerLb);
      expect(p.voucherCode).toMatch(/^RCA-\d{4}-[0-9A-F]{6}$/);
      expect(person(p.collectorKey).municipality).toBe(person(lot.generatorKey).municipality);
    }
    expect(new Set(completed.map((p) => p.voucherCode)).size).toBe(completed.length);
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

  test("nadie de la alcaldía ni de la administración participa en lotes ni retiros", () => {
    for (const key of [demo("alcaldia").key, demo("admin").key]) {
      expect(data.lots.some((l) => l.generatorKey === key)).toBe(false);
      expect(data.pickups.some((p) => p.collectorKey === key)).toBe(false);
    }
  });

  test("hay un retiro reservado para Don José y el lote tiene libras", () => {
    const reserved = data.pickups.find((p) => !p.completedAt)!;
    expect(reserved.collectorKey).toBe(demo("reciclador").key);
    expect(reserved.proposedLb).toBeNull();
    expect(data.lots.find((l) => l.key === reserved.lotKey)).toMatchObject({ status: "reservado", estimatedLb: 130 });
  });
});

describe("comisiones sembradas", () => {
  test("solo compradores de volumen, solo ventas, al 3 % del valor confirmado", () => {
    expect(data.commissions.length).toBeGreaterThan(0);
    for (const c of data.commissions) {
      const pickup = completed.find((p) => p.lotKey === c.lotKey)!;
      const lot = data.lots.find((l) => l.key === c.lotKey)!;
      expect(person(c.collectorKey).tipoValorizador).toBe("volumen");
      expect(lot.modality).toBe("venta");
      expect(c.pct).toBe(3);
      expect(c.grossAmount).toBe(pickup.totalAmount);
      expect(c.amount).toBe(Math.round(c.grossAmount * 3) / 100);
    }
  });

  test("ningún reciclador de base paga comisión; las de más de 30 días figuran cobradas y las recientes, pendientes", () => {
    const baseKeys = new Set(data.people.filter((p) => p.tipoValorizador === "base").map((p) => p.key));
    expect(data.commissions.some((c) => baseKeys.has(c.collectorKey))).toBe(false);
    const cutoff = NOW.getTime() - 30 * 86_400_000;
    expect(data.commissions.some((c) => c.status === "cobrada" && c.paidAt)).toBe(true);
    for (const c of data.commissions) {
      const old = new Date(c.createdAt).getTime() < cutoff;
      expect(c.status).toBe(old ? "cobrada" : "pendiente");
      expect(c.paidAt === null).toBe(!old);
    }
  });
});

describe("ReciclaPuntos sembrados", () => {
  test("solo de entregas confirmadas, para las dos partes", () => {
    for (const pt of data.points) {
      const pickup = completed.find((p) => p.lotKey === pt.lotKey);
      expect(pickup).toBeDefined();
      const lot = data.lots.find((l) => l.key === pt.lotKey)!;
      expect([lot.generatorKey, pickup!.collectorKey]).toContain(pt.personKey);
      expect(pt.points).toBeGreaterThan(0);
      expect(pt.points).toBeLessThanOrEqual(Math.floor(pickup!.confirmedLb!));
      expect(new Date(pt.expiresAt) > new Date(pt.createdAt)).toBe(true);
    }
  });

  test("respetan el tope de 500 puntos por persona y mes", () => {
    const byMonth = new Map<string, number>();
    for (const pt of data.points) {
      const key = `${pt.personKey}:${pt.createdAt.slice(0, 7)}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + pt.points);
    }
    expect([...byMonth.values()].every((total) => total <= 500)).toBe(true);
  });
});
