const TZ = "America/El_Salvador";
const DAY_MS = 86_400_000;

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const clockParts = new Intl.DateTimeFormat("es-SV", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dayParts = new Intl.DateTimeFormat("es-SV", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });

/** "9:00", "14:30": hora sin cero inicial (es-SV lo pone siempre). */
function clock(date: Date): string {
  const parts = Object.fromEntries(clockParts.formatToParts(date).map((p) => [p.type, p.value]));
  return `${Number(parts.hour)}:${parts.minute}`;
}

function dayLabel(date: Date, now: Date): string {
  const key = dayKey.format(date);
  if (key === dayKey.format(now)) return "Hoy";
  if (key === dayKey.format(new Date(now.getTime() + DAY_MS))) return "Mañana";
  const parts = Object.fromEntries(dayParts.formatToParts(date).map((p) => [p.type, p.value.replace(".", "")]));
  return `${parts.weekday} ${parts.day} ${parts.month}`;
}

/** "Hoy 14:00–16:00", "Mañana 9:00–11:00" o "jue 23 oct 9:00–11:00", en hora de El Salvador. */
export function formatPickupWindow(from: Date, to: Date, now: Date = new Date()): string {
  return `${dayLabel(from, now)} ${clock(from)}–${clock(to)}`;
}
