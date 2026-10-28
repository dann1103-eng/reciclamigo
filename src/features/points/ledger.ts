import type { Database } from "@/types/database";

// Lógica pura de ReciclaPuntos. Las reglas viven en la base (puntos_reputacion): aquí solo se
// ordenan y se muestran los movimientos de points_ledger.

export type LedgerRow = Database["public"]["Tables"]["points_ledger"]["Row"];
export type LedgerKind = LedgerRow["kind"];

export type LedgerEntry = {
  id: string;
  kind: LedgerKind;
  /** Positivo si se ganó; negativo si se canjeó. */
  points: number;
  /** Lo que queda sin canjear de un movimiento "ganado"; null en los demás. */
  remaining: number | null;
  /** Cuándo caduca un movimiento "ganado"; null en los demás. */
  expiresAt: string | null;
  note: string | null;
  createdAt: string;
};

export function entryFromRow(row: LedgerRow): LedgerEntry {
  return {
    id: row.id,
    kind: row.kind,
    points: row.points,
    remaining: row.remaining,
    expiresAt: row.expires_at,
    note: row.note,
    createdAt: row.created_at,
  };
}

// El Salvador está en UTC-6 todo el año (sin horario de verano), igual que sv_month_start() en la base.
const SV_OFFSET_MS = 6 * 3_600_000;
const DAY_MS = 86_400_000;

/** Primer instante del mes calendario de El Salvador: el tope mensual se cuenta desde aquí. */
export function svMonthStart(now: Date): Date {
  const local = new Date(now.getTime() - SV_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) + SV_OFFSET_MS);
}

/** Fecha (AAAA-MM-DD) de un instante, en hora de El Salvador. */
function svDay(iso: string): string {
  return new Date(new Date(iso).getTime() - SV_OFFSET_MS).toISOString().slice(0, 10);
}

/** Puntos ganados en el mes en curso: es lo que cuenta contra el tope mensual. */
export function earnedThisMonth(entries: LedgerEntry[], now: Date): number {
  const from = svMonthStart(now).getTime();
  return entries
    .filter((e) => e.kind === "ganado" && new Date(e.createdAt).getTime() >= from)
    .reduce((sum, e) => sum + e.points, 0);
}

/** Lo que todavía puede ganar este mes; null si no hay tope. */
export function monthlyRoom(cap: number | null, earned: number): number | null {
  return cap === null ? null : Math.max(0, cap - earned);
}

export type Expiration = {
  /** AAAA-MM-DD en hora de El Salvador. */
  day: string;
  /** El primero que caduca ese día. */
  expiresAt: string;
  points: number;
  daysLeft: number;
};

/** Puntos vigentes agrupados por día de caducidad, del que vence primero al último. */
export function upcomingExpirations(entries: LedgerEntry[], now: Date, limit = 5): Expiration[] {
  const byDay = new Map<string, Expiration>();
  for (const e of entries) {
    if (e.kind !== "ganado" || !e.expiresAt || !e.remaining || e.remaining <= 0) continue;
    const at = new Date(e.expiresAt).getTime();
    if (at <= now.getTime()) continue;
    const day = svDay(e.expiresAt);
    const current = byDay.get(day);
    if (current) {
      current.points += e.remaining;
      if (at < new Date(current.expiresAt).getTime()) current.expiresAt = e.expiresAt;
    } else {
      byDay.set(day, { day, expiresAt: e.expiresAt, points: e.remaining, daysLeft: 0 });
    }
  }
  return [...byDay.values()]
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(0, limit)
    .map((x) => ({ ...x, daysLeft: Math.ceil((new Date(x.expiresAt).getTime() - now.getTime()) / DAY_MS) }));
}

const integer = new Intl.NumberFormat("es-SV");

export function formatPoints(points: number): string {
  return integer.format(points);
}

const KIND_LABEL: Record<LedgerKind, string> = { ganado: "Ganado", canje: "Canje", ajuste: "Ajuste" };
const DEFAULT_NOTE: Record<LedgerKind, string> = {
  ganado: "Entrega confirmada",
  canje: "Canje registrado por el equipo",
  ajuste: "Ajuste del equipo",
};

/** Una línea del historial lista para mostrar: tipo, puntos con signo y nota. */
export function describeEntry(entry: LedgerEntry): { label: string; tone: LedgerKind; points: string; note: string } {
  const sign = entry.points < 0 ? "−" : "+";
  return {
    label: KIND_LABEL[entry.kind],
    tone: entry.kind,
    points: `${sign}${formatPoints(Math.abs(entry.points))}`,
    note: entry.note?.trim() || DEFAULT_NOTE[entry.kind],
  };
}
