import { describe, expect, test } from "vitest";

import { buildReportModel, formatSvDate, formatSvDateTime, REPORT_FOOTER, type ReportRow } from "./model";

const rows: ReportRow[] = [
  { voucherCode: "RCA-2026-AAA111", completedAt: "2026-10-03T15:00:00Z", collectorName: "Don José Pérez", polymerCode: "PET", confirmedLb: 60 },
  { voucherCode: "RCA-2026-BBB222", completedAt: "2026-10-10T16:30:00Z", collectorName: "Doña María", polymerCode: "HDPE", confirmedLb: 50 },
  { voucherCode: "RCA-2026-CCC333", completedAt: "2026-10-17T14:00:00Z", collectorName: "Don José Pérez", polymerCode: "PET", confirmedLb: 40 },
];

const base = {
  businessName: "Restaurante El Maíz",
  month: "2026-10",
  rows,
  co2Factor: 2,
  generatedAt: new Date("2026-10-28T20:05:00Z"),
};

describe("fechas en hora de El Salvador", () => {
  test("formatSvDate usa UTC-6", () => {
    expect(formatSvDate("2026-11-01T05:30:00Z")).toBe("31/10/2026");
    expect(formatSvDate("2026-11-01T06:00:00Z")).toBe("01/11/2026");
  });

  test("formatSvDateTime agrega la hora", () => {
    expect(formatSvDateTime(new Date("2026-10-28T20:05:00Z"))).toBe("28/10/2026 14:05");
  });
});

describe("buildReportModel", () => {
  test("lleva el título, el negocio y el mes en español", () => {
    const m = buildReportModel(base);
    expect(m.title).toBe("Reporte de trazabilidad");
    expect(m.businessName).toBe("Restaurante El Maíz");
    expect(m.monthLabel).toBe("octubre de 2026");
    expect(m.generatedLabel).toBe("Generado el 28/10/2026 14:05 (hora de El Salvador)");
  });

  test("resume por tipo de plástico: libras con kg entre paréntesis y número de entregas", () => {
    const m = buildReportModel(base);
    expect(m.summary).toEqual([
      { polymerCode: "PET", polymerName: "Tereftalato de polietileno", weightLabel: "100 lb (45.4 kg)", deliveries: 2, deliveriesLabel: "2 entregas" },
      { polymerCode: "HDPE", polymerName: "Polietileno de alta densidad", weightLabel: "50 lb (22.7 kg)", deliveries: 1, deliveriesLabel: "1 entrega" },
    ]);
  });

  test("ordena los plásticos como el resto de la app, sin importar el orden de las filas", () => {
    const shuffled = [rows[1], { ...rows[0], polymerCode: "PS" }, rows[2]];
    expect(buildReportModel({ ...base, rows: shuffled }).summary.map((s) => s.polymerCode)).toEqual(["PET", "HDPE", "PS"]);
  });

  test("totales: libras, entregas y CO2 evitado con el factor de la configuración", () => {
    const m = buildReportModel(base);
    expect(m.totals.totalLb).toBe(150);
    expect(m.totals.weightLabel).toBe("150 lb (68 kg)");
    expect(m.totals.deliveries).toBe(3);
    expect(m.totals.deliveriesLabel).toBe("3 entregas");
    // 150 lb = 68.04 kg de plástico; con factor 2 son 136.08 kg de CO2
    expect(m.totals.co2Kg).toBeCloseTo(136.078, 2);
    expect(m.totals.co2Label).toBe("136.1 kg");
  });

  test("el CO2 cambia con el factor configurado", () => {
    expect(buildReportModel({ ...base, co2Factor: 1 }).totals.co2Label).toBe("68 kg");
  });

  test("muestra toneladas de CO2 desde 1,000 kg", () => {
    const big = [{ ...rows[0], confirmedLb: 2000 }];
    expect(buildReportModel({ ...base, rows: big }).totals.co2Label).toBe("1.81 t");
  });

  test("suma libras con decimales sin arrastrar errores de punto flotante", () => {
    const decimals = [
      { ...rows[0], confirmedLb: 0.1 },
      { ...rows[1], confirmedLb: 0.2 },
    ];
    expect(buildReportModel({ ...base, rows: decimals }).totals.totalLb).toBe(0.3);
  });

  test("lista los comprobantes con fecha, reciclador, peso confirmado y código, en el orden recibido", () => {
    const m = buildReportModel(base);
    expect(m.vouchers).toEqual([
      { dateLabel: "03/10/2026", collectorName: "Don José Pérez", polymerCode: "PET", weightLabel: "60 lb (27.2 kg)", code: "RCA-2026-AAA111" },
      { dateLabel: "10/10/2026", collectorName: "Doña María", polymerCode: "HDPE", weightLabel: "50 lb (22.7 kg)", code: "RCA-2026-BBB222" },
      { dateLabel: "17/10/2026", collectorName: "Don José Pérez", polymerCode: "PET", weightLabel: "40 lb (18.1 kg)", code: "RCA-2026-CCC333" },
    ]);
  });

  test("un mes sin entregas lo dice", () => {
    const m = buildReportModel({ ...base, rows: [] });
    expect(m.summary).toEqual([]);
    expect(m.vouchers).toEqual([]);
    expect(m.totals.deliveries).toBe(0);
    expect(m.totals.deliveriesLabel).toBe("0 entregas");
    expect(m.totals.weightLabel).toBe("0 lb (0 kg)");
    expect(m.totals.co2Label).toBe("0 kg");
    expect(m.emptyMessage).toBe("No hay entregas confirmadas en octubre de 2026.");
  });

  test("con entregas no hay mensaje de mes vacío", () => {
    expect(buildReportModel(base).emptyMessage).toBeNull();
  });

  test("un plástico desconocido no rompe el reporte", () => {
    const m = buildReportModel({ ...base, rows: [{ ...rows[0], polymerCode: "XX" }] });
    expect(m.summary[0]).toMatchObject({ polymerCode: "XX", polymerName: "XX", deliveries: 1 });
  });
});

describe("lenguaje del reporte", () => {
  test("el pie obligatorio lleva el texto exacto", () => {
    expect(REPORT_FOOTER).toBe(
      "Este reporte documenta las entregas registradas en Reciclamigo y puede respaldar la gestión de residuos de la empresa. No es un permiso ni un certificado emitido por una autoridad.",
    );
    expect(buildReportModel(base).footer).toBe(REPORT_FOOTER);
  });

  // Recorre todas las cadenas del modelo (con y sin entregas) menos el pie.
  function strings(value: unknown, out: string[] = []): string[] {
    if (typeof value === "string") out.push(value);
    else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
    else if (value && typeof value === "object") Object.values(value).forEach((v) => strings(v, out));
    return out;
  }

  test.each([
    ["con entregas", base],
    ["sin entregas", { ...base, rows: [] }],
  ])("ninguna otra cadena (%s) dice \"certificad\" ni \"ANDRES\"", (_name, input) => {
    const all = strings(buildReportModel(input)).filter((s) => s !== REPORT_FOOTER);
    expect(all.length).toBeGreaterThan(10);
    for (const s of all) {
      expect(s, s).not.toMatch(/certificad/i);
      expect(s, s).not.toMatch(/andres/i);
      expect(s, s).not.toMatch(/certifica/i);
    }
  });

  test("no usa el subíndice de CO₂ (la fuente estándar del PDF no lo dibuja)", () => {
    for (const s of strings(buildReportModel(base))) expect(s).not.toContain("₂");
  });
});
