import { POLYMER_CODES, POLYMERS, type PolymerCode } from "@/lib/domain/polymers";
import { co2AvoidedKg, formatCo2, formatLbKg } from "@/lib/domain/units";

import { monthLabel } from "./months";

/**
 * Pie obligatorio de cada página del reporte, con el texto exacto del documento de cambios. Es la
 * única cadena del reporte que nombra esa palabra prohibida, y es para negarla. No lo cambies sin
 * pasar por quien lleva el lenguaje legal.
 */
export const REPORT_FOOTER =
  "Este reporte documenta las entregas registradas en Reciclamigo y puede respaldar la gestión de residuos de la empresa. No es un permiso ni un certificado emitido por una autoridad.";

/** Una entrega confirmada del mes (lo que devuelve monthly_report()). */
export type ReportRow = {
  voucherCode: string;
  /** ISO. */
  completedAt: string;
  collectorName: string;
  polymerCode: string;
  confirmedLb: number;
};

export type ReportModel = {
  title: string;
  businessName: string;
  /** "2026-10". */
  month: string;
  /** "octubre de 2026". */
  monthLabel: string;
  generatedLabel: string;
  summaryHeading: string;
  summaryColumns: { polymer: string; weight: string; deliveries: string };
  summary: {
    polymerCode: string;
    polymerName: string;
    /** "100 lb (45.4 kg)". */
    weightLabel: string;
    deliveries: number;
    deliveriesLabel: string;
  }[];
  totalsHeading: string;
  totals: {
    totalLb: number;
    weightLabel: string;
    deliveries: number;
    deliveriesLabel: string;
    co2Kg: number;
    co2Label: string;
  };
  totalLabels: { weight: string; deliveries: string; co2: string };
  /** Cómo se calculó el CO2, para que quien lo lea pueda repetirlo. */
  co2Note: string;
  vouchersHeading: string;
  voucherColumns: { date: string; collector: string; polymer: string; weight: string; code: string };
  vouchers: { dateLabel: string; collectorName: string; polymerCode: string; weightLabel: string; code: string }[];
  /** Mes sin entregas confirmadas. */
  emptyMessage: string | null;
  footer: string;
};

const TZ = "America/El_Salvador";

const dayFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const clockFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const factorFormat = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 2 });

const parts = (format: Intl.DateTimeFormat, date: Date) =>
  Object.fromEntries(format.formatToParts(date).map((p) => [p.type, p.value]));

/** "28/10/2026", en hora de El Salvador. */
export function formatSvDate(iso: string | Date): string {
  const p = parts(dayFormat, new Date(iso));
  return `${p.day}/${p.month}/${p.year}`;
}

/** "28/10/2026 14:05", en hora de El Salvador. */
export function formatSvDateTime(iso: string | Date): string {
  const date = new Date(iso);
  const c = parts(clockFormat, date);
  return `${formatSvDate(date)} ${c.hour}:${c.minute}`;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const deliveriesLabel = (n: number) => `${n} ${n === 1 ? "entrega" : "entregas"}`;

function polymerOrder(code: string): number {
  const i = POLYMER_CODES.indexOf(code as PolymerCode);
  return i === -1 ? POLYMER_CODES.length : i;
}

/**
 * Arma lo que dice el reporte de trazabilidad, sin dibujar nada. Pesos en libras con el
 * equivalente en kg entre paréntesis; CO2 sin subíndice porque la fuente estándar del PDF
 * no lo dibuja.
 */
export function buildReportModel(input: {
  businessName: string;
  /** "2026-10". */
  month: string;
  rows: ReportRow[];
  /** Kg de CO2 evitados por cada kg de plástico (configuración). */
  co2Factor: number;
  generatedAt: Date;
}): ReportModel {
  const { rows, co2Factor } = input;
  const label = monthLabel(input.month);

  const byPolymer = new Map<string, { lb: number; deliveries: number }>();
  for (const row of rows) {
    const entry = byPolymer.get(row.polymerCode) ?? { lb: 0, deliveries: 0 };
    entry.lb += row.confirmedLb;
    entry.deliveries += 1;
    byPolymer.set(row.polymerCode, entry);
  }

  const summary = [...byPolymer.entries()]
    .sort(([a], [b]) => polymerOrder(a) - polymerOrder(b) || a.localeCompare(b))
    .map(([code, { lb, deliveries }]) => ({
      polymerCode: code,
      polymerName: POLYMERS[code as PolymerCode]?.name ?? code,
      weightLabel: formatLbKg(round2(lb), 2),
      deliveries,
      deliveriesLabel: deliveriesLabel(deliveries),
    }));

  const totalLb = round2(rows.reduce((sum, r) => sum + r.confirmedLb, 0));
  const co2Kg = co2AvoidedKg(totalLb, co2Factor);

  return {
    title: "Reporte de trazabilidad",
    businessName: input.businessName,
    month: input.month,
    monthLabel: label,
    generatedLabel: `Generado el ${formatSvDateTime(input.generatedAt)} (hora de El Salvador)`,
    summaryHeading: "Resumen por tipo de plástico",
    summaryColumns: { polymer: "Plástico", weight: "Peso confirmado", deliveries: "Entregas" },
    summary,
    totalsHeading: "Totales del mes",
    totals: {
      totalLb,
      weightLabel: formatLbKg(totalLb, 2),
      deliveries: rows.length,
      deliveriesLabel: deliveriesLabel(rows.length),
      co2Kg,
      co2Label: formatCo2(co2Kg),
    },
    totalLabels: { weight: "Plástico recuperado", deliveries: "Entregas confirmadas", co2: "CO2 evitado" },
    co2Note: `Calculado con ${factorFormat.format(co2Factor)} kg de CO2 evitados por cada kg de plástico recuperado.`,
    vouchersHeading: "Comprobantes",
    voucherColumns: { date: "Fecha", collector: "Reciclador", polymer: "Plástico", weight: "Peso confirmado", code: "Comprobante" },
    vouchers: rows.map((r) => ({
      dateLabel: formatSvDate(r.completedAt),
      collectorName: r.collectorName,
      polymerCode: r.polymerCode,
      weightLabel: formatLbKg(r.confirmedLb, 2),
      code: r.voucherCode,
    })),
    emptyMessage: rows.length === 0 ? `No hay entregas confirmadas en ${label}.` : null,
    footer: REPORT_FOOTER,
  };
}
