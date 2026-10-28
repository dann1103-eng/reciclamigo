import type { PlanTier } from "@/lib/domain/types";

export type PlanState = "activo" | "vencido" | "gratis";

/** Un comercio con su plan (generator_plans puede no tener fila: entonces es gratis). */
export type AdminPlanRow = {
  profileId: string;
  name: string;
  orgType: string;
  municipality: string;
  plan: PlanTier | null;
  startedAt: string | null;
  expiresAt: string | null;
  /** Pidió que se le active el plan y el administrador todavía no lo atendió. */
  requestedAt: string | null;
};

type PlanDates = Pick<AdminPlanRow, "plan" | "startedAt" | "expiresAt">;

/**
 * Mismo criterio que has_active_plan() en la base: Trazabilidad que ya empezó y no ha vencido.
 * "vencido" es un plan de pago que ya pasó su fecha; un plan desactivado a mano vuelve a "gratis".
 */
export function planState(row: PlanDates, now: Date = new Date()): PlanState {
  if (row.plan !== "trazabilidad") return "gratis";
  const t = now.getTime();
  if (row.startedAt && new Date(row.startedAt).getTime() > t) return "gratis";
  if (row.expiresAt && new Date(row.expiresAt).getTime() <= t) return "vencido";
  return "activo";
}

const STATE_ORDER: Record<PlanState, number> = { activo: 0, vencido: 1, gratis: 2 };

const time = (iso: string | null) => (iso ? new Date(iso).getTime() : Number.POSITIVE_INFINITY);

/**
 * Primero los que pidieron activación (el que lleva más tiempo esperando, arriba); después activos
 * (el que vence antes, primero), vencidos y gratis, cada grupo por nombre.
 */
export function sortPlanRows(rows: AdminPlanRow[], now: Date = new Date()): AdminPlanRow[] {
  return [...rows].sort((a, b) => {
    if (Boolean(a.requestedAt) !== Boolean(b.requestedAt)) return a.requestedAt ? -1 : 1;
    if (a.requestedAt && b.requestedAt) return time(a.requestedAt) - time(b.requestedAt);

    const sa = planState(a, now);
    const sb = planState(b, now);
    if (sa !== sb) return STATE_ORDER[sa] - STATE_ORDER[sb];
    if (sa === "activo" && time(a.expiresAt) !== time(b.expiresAt)) return time(a.expiresAt) - time(b.expiresAt);
    return a.name.localeCompare(b.name, "es");
  });
}
