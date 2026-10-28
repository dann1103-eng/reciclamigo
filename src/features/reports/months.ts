import { svDateInput } from "@/features/lots/sv-time";

/** Cuántos meses hacia atrás ofrece la pantalla de reportes. */
export const REPORT_MONTHS = 12;

const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const MONTH_KEY = /^20\d{2}-(0[1-9]|1[0-2])$/;

/** "2026-10": un mes calendario de El Salvador. */
export function isMonthKey(value: string): boolean {
  return MONTH_KEY.test(value);
}

/** Mes en curso en hora de El Salvador (Vercel corre en UTC). */
export function currentMonthKey(now: Date = new Date()): string {
  return svDateInput(now).slice(0, 7);
}

/** Los últimos `count` meses, empezando por el mes en curso. */
export function lastMonths(now: Date = new Date(), count: number = REPORT_MONTHS): string[] {
  const [year, month] = currentMonthKey(now).split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const index = year * 12 + (month - 1) - i;
    const y = Math.floor(index / 12);
    const m = (index % 12) + 1;
    return `${y}-${String(m).padStart(2, "0")}`;
  });
}

/** "octubre de 2026". */
export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} de ${year}`;
}

export function reportFilename(key: string): string {
  return `reporte-trazabilidad-${key}.pdf`;
}
