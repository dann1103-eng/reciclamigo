import type { Json } from "@/types/database";

export type ReleaseReason = "generador" | "reciclador" | "automatica";

/**
 * Lo que la app avisa, ya en camelCase. Los cinco primeros salen de la cola
 * (`notification_queue`, payload en snake_case); `plan_activado` no pasa por la cola todavía:
 * quien active un plan a mano puede llamar a `notify()` con él.
 */
export type NotifyEvent =
  | {
      type: "lote_cercano";
      lotId: string;
      polymerCode: string;
      estimatedLb: number;
      generatorName: string | null;
      /** La base lo deja en null si el reciclador no tiene ubicación guardada. */
      distanceM: number | null;
    }
  | { type: "lote_reservado"; lotId: string; pickupId: string; polymerCode: string; estimatedLb: number }
  | { type: "entrega_propuesta"; pickupId: string; lotId: string; proposedLb: number }
  | { type: "entrega_confirmada"; pickupId: string; lotId: string; confirmedLb: number; voucherCode: string }
  | { type: "reserva_liberada"; lotId: string; reason: ReleaseReason }
  | { type: "plan_activado" };

/** Lo que llega a la pantalla del teléfono. `url` es una ruta de la app; `tag` agrupa avisos repetidos. */
export type Message = { title: string; body: string; url: string; tag: string };

type Payload = { [key: string]: Json | undefined };

const isRecord = (value: Json): value is Payload =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (p: Payload, key: string): string | undefined => {
  const value = p[key];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
};

const number = (p: Payload, key: string): number | undefined => {
  const value = p[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
};

const REASONS: readonly string[] = ["generador", "reciclador", "automatica"];

/**
 * Convierte una fila de la cola en un evento tipado. Devuelve null si el evento no se conoce o el
 * payload no trae lo necesario: así un aviso mal formado se descarta en vez de mandar texto roto.
 */
export function eventFromQueueRow(event: string, payload: Json): NotifyEvent | null {
  if (event === "plan_activado") return { type: "plan_activado" };
  if (!isRecord(payload)) return null;

  switch (event) {
    case "lote_cercano": {
      const lotId = text(payload, "lot_id");
      const polymerCode = text(payload, "polymer_code");
      const estimatedLb = number(payload, "estimated_lb");
      if (!lotId || !polymerCode || estimatedLb === undefined) return null;
      return {
        type: "lote_cercano",
        lotId,
        polymerCode,
        estimatedLb,
        generatorName: text(payload, "generator_name") ?? null,
        distanceM: number(payload, "distance_m") ?? null,
      };
    }
    case "lote_reservado": {
      const lotId = text(payload, "lot_id");
      const pickupId = text(payload, "pickup_id");
      const polymerCode = text(payload, "polymer_code");
      const estimatedLb = number(payload, "estimated_lb");
      if (!lotId || !pickupId || !polymerCode || estimatedLb === undefined) return null;
      return { type: "lote_reservado", lotId, pickupId, polymerCode, estimatedLb };
    }
    case "entrega_propuesta": {
      const pickupId = text(payload, "pickup_id");
      const lotId = text(payload, "lot_id");
      const proposedLb = number(payload, "proposed_lb");
      if (!pickupId || !lotId || proposedLb === undefined) return null;
      return { type: "entrega_propuesta", pickupId, lotId, proposedLb };
    }
    case "entrega_confirmada": {
      const pickupId = text(payload, "pickup_id");
      const lotId = text(payload, "lot_id");
      const confirmedLb = number(payload, "confirmed_lb");
      const voucherCode = text(payload, "voucher_code");
      if (!pickupId || !lotId || confirmedLb === undefined || !voucherCode) return null;
      return { type: "entrega_confirmada", pickupId, lotId, confirmedLb, voucherCode };
    }
    case "reserva_liberada": {
      const lotId = text(payload, "lot_id");
      const reason = text(payload, "reason");
      if (!lotId || !reason || !REASONS.includes(reason)) return null;
      return { type: "reserva_liberada", lotId, reason: reason as ReleaseReason };
    }
    default:
      return null;
  }
}
