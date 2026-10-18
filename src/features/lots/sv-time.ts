// El Salvador: UTC-6 todo el año (sin horario de verano). Vercel corre en UTC.
const SV_OFFSET_MS = 6 * 3_600_000;
const DAY_MS = 86_400_000;

/** "2026-10-21" + "09:00" en hora de El Salvador → ISO en UTC. null si falta o no es válida. */
export function svDateTimeToIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const parsed = new Date(`${date}T${time}:00-06:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Fecha local de El Salvador (YYYY-MM-DD) para un <input type="date">, con días de desfase. */
export function svDateInput(now: Date = new Date(), addDays = 0): string {
  return new Date(now.getTime() - SV_OFFSET_MS + addDays * DAY_MS).toISOString().slice(0, 10);
}
