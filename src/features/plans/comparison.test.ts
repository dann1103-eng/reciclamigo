import { describe, expect, test } from "vitest";

import { planComparisonRows, planPriceLabel } from "./comparison";

const settings = { freeLotsPerMonth: 8, freeHistoryDays: 30 };

describe("planComparisonRows", () => {
  test("son las 12 funciones de la sección 3 del documento, en orden", () => {
    expect(planComparisonRows(settings).map((r) => r.feature)).toEqual([
      "Lotes publicados al mes",
      "Mapa de lotes, reserva y enlace a WhatsApp",
      "Comprobante de cada venta",
      "Republicación automática si el valorizador no llega",
      "Repetir lote con un toque",
      "Precio de referencia por material",
      "ReciclaPuntos por entregas confirmadas",
      'Insignia "Comercio Circular"',
      "Historial",
      "Reporte mensual de trazabilidad",
      "Retiros programados con el mismo valorizador",
      "Prioridad en avisos (antes y en mayor radio)",
    ]);
  });

  test("el límite de lotes y los días de historial salen de la configuración", () => {
    const rows = planComparisonRows({ freeLotsPerMonth: 10, freeHistoryDays: 45 });
    expect(rows[0]).toMatchObject({ free: "Hasta 10", paid: "Ilimitados" });
    expect(rows[8]).toMatchObject({ free: "Últimos 45 días", paid: "Completo y exportable (CSV y PDF)" });
  });

  test("lo que solo trae el plan de pago dice No en gratis", () => {
    const byFeature = Object.fromEntries(planComparisonRows(settings).map((r) => [r.feature, r]));
    expect(byFeature["Reporte mensual de trazabilidad"]).toMatchObject({ free: "No", paid: "Sí" });
    expect(byFeature["Retiros programados con el mismo valorizador"]).toMatchObject({ free: "No", paid: "Sí" });
    expect(byFeature["Prioridad en avisos (antes y en mayor radio)"]).toMatchObject({ free: "No", paid: "Sí" });
    expect(byFeature["Comprobante de cada venta"]).toMatchObject({ free: "Sí", paid: "Sí" });
  });

  test("la insignia es básica en gratis y con QR en el plan", () => {
    const badge = planComparisonRows(settings).find((r) => r.feature.startsWith("Insignia"));
    expect(badge).toMatchObject({
      free: "Básica, en su perfil",
      paid: "Con QR y página pública de libras recicladas",
    });
  });

  test("no menciona planes viejos, API, bot ni certificados", () => {
    const text = planComparisonRows(settings)
      .flatMap((r) => [r.feature, r.free, r.paid])
      .join(" | ");
    expect(text).not.toMatch(/b[aá]sico|premium|corporativo|\bAPI\b|\bbot\b|certific|usuarios|sucursal/i);
  });
});

describe("planPriceLabel", () => {
  test("precio mensual con la moneda", () => {
    expect(planPriceLabel(14.99)).toBe("$14.99/mes");
  });
});
