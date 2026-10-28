import "server-only";

import { channels } from "./channels";
import { deliver } from "./deliver";
import { messageFor } from "./messages";
import type { NotifyEvent } from "./types";

export type { NotifyEvent } from "./types";

/**
 * Único punto de envío de avisos. Arma el mensaje y lo manda por todos los canales (hoy, push).
 * Resuelve cuando se entregó o cuando no había dónde entregarlo (la persona no activó avisos:
 * el lote igual aparece en el mapa). Lanza solo si hubo canales con problemas y nadie lo recibió,
 * para que quien llama (la cola) pueda reintentar.
 */
export async function notify(profileId: string, event: NotifyEvent): Promise<void> {
  const outcome = await deliver(channels, profileId, messageFor(event));
  if (outcome.status === "failed") throw new Error(outcome.error);
}
