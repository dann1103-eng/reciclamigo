import { normalizeSvPhone } from "@/lib/domain/phone";

import { formatPoints } from "./ledger";

/** Mensaje prellenado para pedir un canje: el equipo lo registra a mano. */
export function redeemMessage(p: { name: string; balance: number }): string {
  const points = `${formatPoints(p.balance)} ${p.balance === 1 ? "punto" : "puntos"}`;
  return `Hola, soy ${p.name} y quiero canjear mis ReciclaPuntos. Mi saldo es de ${points}.`;
}

/** Enlace wa.me al WhatsApp del equipo con el mensaje prellenado. */
export function redeemLink(phone: string, text: string): string {
  return `https://wa.me/${normalizeSvPhone(phone) ?? ""}?text=${encodeURIComponent(text)}`;
}
