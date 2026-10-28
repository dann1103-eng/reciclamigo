import type { PlanStatus } from "@/lib/domain/plans";

export type CircularCardState =
  /** Aún no hay insignia: sale con la primera entrega confirmada. */
  | { kind: "sin-entregas" }
  /** Insignia básica en el perfil; con el plan viene la página pública con QR. */
  | { kind: "basica"; planExpiredAt: string | null }
  | { kind: "publica" };

/**
 * Qué muestra la tarjeta de la insignia en la pantalla del comercio.
 * Un plan vencido se reconoce porque ya no está activo y su fecha de vencimiento quedó atrás.
 */
export function circularCardState(p: {
  deliveries: number;
  plan: Pick<PlanStatus, "active" | "expiresAt">;
  now?: Date;
}): CircularCardState {
  if (p.deliveries < 1) return { kind: "sin-entregas" };
  if (p.plan.active) return { kind: "publica" };
  const now = p.now ?? new Date();
  const expired = p.plan.expiresAt !== null && new Date(p.plan.expiresAt) <= now;
  return { kind: "basica", planExpiredAt: expired ? p.plan.expiresAt : null };
}

export function deliveriesLabel(count: number): string {
  return count === 1 ? "entrega confirmada" : "entregas confirmadas";
}

const longDate = new Intl.DateTimeFormat("es-SV", { timeZone: "America/El_Salvador", dateStyle: "long" });

/** "20 de octubre de 2026", en hora de El Salvador. */
export function formatLongDate(iso: string): string {
  return longDate.format(new Date(iso));
}
