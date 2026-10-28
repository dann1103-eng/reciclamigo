import { pushChannel } from "./push";
import type { Message } from "./types";

/** Cómo le fue a un canal con una persona. */
export type ChannelResult =
  /** Llegó al menos a un dispositivo. */
  | { status: "sent"; delivered: number }
  /** La persona no tiene por dónde recibirlo (no activó avisos). No es un fallo. */
  | { status: "no_devices" }
  /** Al canal le falta configuración (llaves). `reason` dice qué. */
  | { status: "not_configured"; reason: string }
  /** No llegó a ningún dispositivo por un error que puede pasar con el tiempo. */
  | { status: "failed"; error: string };

/**
 * Un canal de aviso. Hoy solo existe el push de la PWA; en una fase 2, WhatsApp (API oficial de Meta)
 * sería un canal más en `channels`, sin tocar el flujo de los lotes.
 */
export interface NotifyChannel {
  name: string;
  send(profileId: string, message: Message): Promise<ChannelResult>;
}

export const channels: NotifyChannel[] = [pushChannel];
