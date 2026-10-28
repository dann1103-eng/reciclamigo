import type { Database } from "@/types/database";

import type { PlanTier } from "./types";

type PlanRow = Database["public"]["Functions"]["plan_status"]["Returns"][number];

/** Plan del comercio y su uso del mes (lo que devuelve plan_status()). */
export type PlanStatus = {
  plan: PlanTier;
  /** Plan Trazabilidad vigente hoy. */
  active: boolean;
  startedAt: string | null;
  expiresAt: string | null;
  /** El comercio pidió que le activen el plan. */
  requestedAt: string | null;
  publishedThisMonth: number;
  /** Lotes gratis por mes; null si no hay límite configurado. */
  freeLimit: number | null;
};

export function planStatusFromRow(row: PlanRow | undefined | null): PlanStatus {
  if (!row) {
    return { plan: "gratis", active: false, startedAt: null, expiresAt: null, requestedAt: null, publishedThisMonth: 0, freeLimit: null };
  }
  return {
    plan: row.plan,
    active: row.active,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    requestedAt: row.requested_at,
    publishedThisMonth: row.published_this_month,
    freeLimit: row.free_limit,
  };
}

/** Lotes que todavía puede publicar este mes; null = ilimitados (plan activo). */
export function freeLotsLeft(status: PlanStatus): number | null {
  if (status.active || status.freeLimit === null) return null;
  return Math.max(0, status.freeLimit - status.publishedThisMonth);
}

/** El siguiente lote ya no entra en el plan gratis. */
export function limitReached(status: PlanStatus): boolean {
  const left = freeLotsLeft(status);
  return left !== null && left === 0;
}
