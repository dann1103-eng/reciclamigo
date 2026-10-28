// Fechas en hora de El Salvador: UTC-6 todo el año, sin horario de verano. Vercel corre en UTC.
const SV_OFFSET_MS = 6 * 3_600_000;
const DAY_MS = 86_400_000;

const dateFormat = new Intl.DateTimeFormat("es-SV", {
  timeZone: "America/El_Salvador",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormat = new Intl.DateTimeFormat("es-SV", {
  timeZone: "America/El_Salvador",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** Hoy en El Salvador, como YYYY-MM-DD (lo que usa un <input type="date">). */
export function svToday(now: Date = new Date()): string {
  return new Date(now.getTime() - SV_OFFSET_MS).toISOString().slice(0, 10);
}

/** Suma días a una fecha YYYY-MM-DD. */
export function addDaysToDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Final de ese día en El Salvador, en ISO/UTC: el plan queda vigente durante todo el día elegido.
 * null si la fecha no existe (el 31 de febrero, por ejemplo) o está mal escrita.
 */
export function endOfSvDayIso(date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const end = new Date(`${date}T23:59:59-06:00`);
  if (Number.isNaN(end.getTime())) return null;
  // new Date() corrige en silencio 2026-02-31 a marzo: si el día cambió, la fecha no existía.
  return svToday(end) === date ? end.toISOString() : null;
}

/** "27 nov 2026" */
export function formatSvDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** "27 nov 2026, 11:59 p. m." */
export function formatSvDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}
