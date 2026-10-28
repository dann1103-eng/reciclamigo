import { normalizeSvPhone } from "@/lib/domain/phone";
import type { PolymerCode } from "@/lib/domain/polymers";
import { formatLb } from "@/lib/domain/units";

/** Enlace wa.me con el mensaje prellenado. El número va en formato internacional de El Salvador (503XXXXXXXX). */
export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${normalizeSvPhone(phone) ?? ""}?text=${encodeURIComponent(text)}`;
}

/** Código corto y legible del lote (L-8F14E4), sacado de su id: no necesita columna aparte. */
export function lotCode(id: string): string {
  return `L-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

/** Dirección del lote en la app: la abre quien recibe el mensaje de WhatsApp. */
export function lotUrl(id: string, siteUrl: string = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"): string {
  return `${siteUrl.replace(/\/+$/, "")}/lote/${id}`;
}

type LotRef = { lotId: string; polymerCode: PolymerCode; estimatedLb: number };

/** Del reciclador al comercio, al reservar: código del lote, plástico, libras y enlace al lote en la app. */
export function reservationMessage(p: LotRef & { collectorName: string; windowLabel: string; siteUrl?: string }): string {
  return `Hola, soy ${p.collectorName} de Reciclamigo. Reservé tu lote ${lotCode(p.lotId)}: ${formatLb(p.estimatedLb)} de ${p.polymerCode} (${p.windowLabel}). Míralo aquí: ${lotUrl(p.lotId, p.siteUrl)}`;
}

/** Del comercio al reciclador que reservó. */
export function generatorMessage(p: LotRef & { generatorName: string; siteUrl?: string }): string {
  return `Hola, le escribimos de ${p.generatorName} por Reciclamigo, sobre el lote ${lotCode(p.lotId)} de ${formatLb(p.estimatedLb)} de ${p.polymerCode}. ${lotUrl(p.lotId, p.siteUrl)}`;
}
