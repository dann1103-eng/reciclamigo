import { formatKg } from "@/lib/domain/format";
import type { PolymerCode } from "@/lib/domain/polymers";

/** Enlace wa.me con el mensaje prellenado. El número se reduce a dígitos (503XXXXXXXX). */
export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export function collectorMessage(p: { collectorName: string; kg: number; polymerCode: PolymerCode; windowLabel: string }): string {
  return `Hola, soy ${p.collectorName} de Reciclamigo. Voy por tu lote de ${formatKg(p.kg)} de ${p.polymerCode} (${p.windowLabel}).`;
}

export function generatorMessage(p: { generatorName: string; kg: number; polymerCode: PolymerCode }): string {
  return `Hola, le escribimos de ${p.generatorName} por Reciclamigo, sobre el lote de ${formatKg(p.kg)} de ${p.polymerCode}.`;
}
