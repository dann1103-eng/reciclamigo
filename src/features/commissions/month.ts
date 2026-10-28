import { svToday } from "@/features/plans/dates";

// Los meses de las comisiones se cuentan en hora de El Salvador (UTC-6), igual que commission_summary()
// en la base: el 1 de octubre empieza a las 06:00 UTC.

/** Mes como "YYYY-MM". */
export type MonthKey = string;

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

const monthName = new Intl.DateTimeFormat("es-SV", { timeZone: "UTC", month: "long", year: "numeric" });

export function currentMonth(now: Date = new Date()): MonthKey {
  return svToday(now).slice(0, 7);
}

/** Mes (hora de El Salvador) al que pertenece un instante. */
export function monthOf(iso: string): MonthKey {
  return svToday(new Date(iso)).slice(0, 7);
}

/** El mes de la URL si es válido; si no, el actual. */
export function parseMonth(raw: string | undefined, now: Date = new Date()): MonthKey {
  return raw && MONTH_RE.test(raw) ? raw : currentMonth(now);
}

function split(month: MonthKey): { year: number; month: number } {
  const [year, m] = month.split("-").map(Number);
  return { year, month: m };
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const { year, month: m } = split(month);
  const index = year * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Primer día del mes: el argumento p_month de commission_summary(). */
export function monthFirstDay(month: MonthKey): string {
  return `${month}-01`;
}

/** Instantes (ISO/UTC) en que empieza el mes y el siguiente: created_at >= from y < to. */
export function monthRange(month: MonthKey): { from: string; to: string } {
  const start = (m: MonthKey) => new Date(`${m}-01T00:00:00-06:00`).toISOString();
  return { from: start(month), to: start(shiftMonth(month, 1)) };
}

/** "octubre de 2026" */
export function monthLabel(month: MonthKey): string {
  const { year, month: m } = split(month);
  return monthName.format(new Date(Date.UTC(year, m - 1, 15)));
}

/** Del mes actual hacia atrás, para el selector. */
export function recentMonths(now: Date = new Date(), count = 24): MonthKey[] {
  const current = currentMonth(now);
  return Array.from({ length: count }, (_, i) => shiftMonth(current, -i));
}
