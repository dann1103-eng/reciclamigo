import { formatDistance } from "@/lib/domain/format";
import { formatLb } from "@/lib/domain/units";

import type { Message, NotifyEvent } from "./types";

const RELEASED_BODY = {
  generador: "El comercio liberó el lote. Ya no está reservado para ti.",
  reciclador: "El reciclador soltó el lote. Se publicó de nuevo y se avisó a otros recicladores.",
  automatica: "Pasó el plazo sin confirmar la entrega, así que el lote volvió al mapa.",
} as const;

/**
 * El texto de cada aviso, en español llano y en libras. La `tag` hace que un aviso repetido del mismo
 * lote reemplace al anterior en la pantalla del teléfono en vez de apilarse.
 */
export function messageFor(event: NotifyEvent): Message {
  switch (event.type) {
    case "lote_cercano": {
      const where = event.distanceM === null ? "cerca de ti" : `a ${formatDistance(event.distanceM)}`;
      return {
        title: `Lote de ${event.polymerCode} ${where}`,
        body: `${event.generatorName ?? "Un comercio"} · ${formatLb(event.estimatedLb)}`,
        url: `/reciclador?lote=${encodeURIComponent(event.lotId)}`,
        tag: `lote-${event.lotId}`,
      };
    }
    case "lote_reservado":
      return {
        title: `Reservaron tu lote de ${event.polymerCode}`,
        body: `${formatLb(event.estimatedLb)}. Revisa tu WhatsApp para coordinar el retiro.`,
        url: "/comercio",
        tag: `reserva-${event.lotId}`,
      };
    case "entrega_propuesta":
      return {
        title: "Confirma la entrega",
        body: `El comercio registró ${formatLb(event.proposedLb)}. Acéptala o corrígela para que cuente.`,
        url: "/reciclador/retiros",
        tag: `propuesta-${event.pickupId}`,
      };
    case "entrega_confirmada":
      return {
        title: "Entrega confirmada",
        body: `${formatLb(event.confirmedLb)}. Tu comprobante ${event.voucherCode} ya está listo.`,
        url: "/comercio",
        tag: `confirmada-${event.pickupId}`,
      };
    case "reserva_liberada":
      return {
        title: "Reserva liberada",
        body: RELEASED_BODY[event.reason],
        // /inicio lleva a cada quien a su pantalla (la liberación llega al comercio o al reciclador).
        url: "/inicio",
        tag: `liberada-${event.lotId}`,
      };
    case "plan_activado":
      return {
        title: "Tu Plan Trazabilidad está activo",
        body: "Ya tienes lotes sin límite, historial completo y reporte mensual.",
        url: "/comercio/plan",
        tag: "plan",
      };
  }
}
