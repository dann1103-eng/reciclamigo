import { formatPickupWindow } from "@/features/lots/format-window";
import { svDateInput, svDateTimeToIso } from "@/features/lots/sv-time";
import type { PolymerCode } from "@/lib/domain/polymers";
import type { Modality } from "@/lib/domain/types";
import { formatLb } from "@/lib/domain/units";

/** Un retiro programado del comercio, con el nombre del reciclador de confianza. */
export type ScheduledPickup = {
  id: string;
  collectorId: string;
  /** null si no se pudo leer el perfil. */
  collectorName: string | null;
  polymerCode: PolymerCode;
  estimatedLb: number;
  modality: Modality;
  /** 0 = domingo … 6 = sábado (como extract(dow) en la base). */
  weekday: number;
  /** HH:MM, hora de El Salvador. */
  startTime: string;
  endTime: string;
  notes: string | null;
  active: boolean;
};

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function weekdayLabel(weekday: number): string {
  return WEEKDAYS[weekday] ?? "";
}

/** La base devuelve `time` como "09:00:00"; los formularios y p_start_time usan "09:00". */
export function toHHMM(time: string): string {
  return time.slice(0, 5);
}

/** "9:00", "14:30": hora sin cero inicial, igual que las ventanas de retiro del resto de la app. */
export function formatClock(time: string): string {
  const [hour, minute] = toHHMM(time).split(":");
  return `${Number(hour)}:${minute}`;
}

/** "Cada lunes de 9:00 a 11:00 · 120 lb (1.2 qq) de PET · con Don José". */
export function describeScheduled(p: Pick<ScheduledPickup, "weekday" | "startTime" | "endTime" | "estimatedLb" | "polymerCode" | "collectorName">): string {
  const who = p.collectorName ?? "tu reciclador de confianza";
  return `Cada ${weekdayLabel(p.weekday)} de ${formatClock(p.startTime)} a ${formatClock(p.endTime)} · ${formatLb(p.estimatedLb)} de ${p.polymerCode} · con ${who}`;
}

/** La próxima vez que toca este retiro (en hora de El Salvador), o null si los datos no son válidos. */
export function nextPickupWindow(
  p: Pick<ScheduledPickup, "weekday" | "startTime" | "endTime">,
  now: Date = new Date(),
): { from: Date; to: Date } | null {
  for (let add = 0; add <= 7; add++) {
    const date = svDateInput(now, add);
    if (new Date(`${date}T12:00:00Z`).getUTCDay() !== p.weekday) continue;
    const from = svDateTimeToIso(date, toHHMM(p.startTime));
    const to = svDateTimeToIso(date, toHHMM(p.endTime));
    if (!from || !to) return null;
    if (new Date(from) <= now) continue;
    return { from: new Date(from), to: new Date(to) };
  }
  return null;
}

/** "Hoy 14:00–16:00", "Mañana 9:00–11:00" o "mié 4 nov 9:00–11:00". */
export function nextPickupLabel(p: Pick<ScheduledPickup, "weekday" | "startTime" | "endTime">, now: Date = new Date()): string | null {
  const window = nextPickupWindow(p, now);
  return window ? formatPickupWindow(window.from, window.to, now) : null;
}

/** Un retiro programado ya listo para mostrar (se arma en el servidor para no depender de la hora del navegador). */
export type ScheduledView = ScheduledPickup & { description: string; nextLabel: string | null };

export function toScheduledView(p: ScheduledPickup, now: Date = new Date()): ScheduledView {
  return { ...p, description: describeScheduled(p), nextLabel: p.active ? nextPickupLabel(p, now) : null };
}
