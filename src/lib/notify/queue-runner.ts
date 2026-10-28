import type { Json } from "@/types/database";

import { errorText } from "./errors";
import { eventFromQueueRow, type NotifyEvent } from "./types";

export type QueueRow = { id: string; profile_id: string; event: string; payload: Json; attempts: number };

/** Lo que el runner necesita de la base: reclamar los avisos vencidos y cerrar cada uno. */
export type QueueStore = {
  claim: (limit: number) => Promise<QueueRow[]>;
  /** `error` nulo = enviado. Con error, la base lo reintenta hasta 3 intentos. */
  finish: (id: string, error: string | null) => Promise<void>;
};

// Cuántos avisos se mandan a la vez: rápido sin abrir decenas de conexiones.
const CONCURRENCY = 5;
const MAX_ERROR_LENGTH = 500;

/**
 * Vacía la cola: reclama los avisos vencidos, manda cada uno con `send` y lo cierra. Lo que falle
 * en un aviso (de la red, de la base o un evento mal formado) no tumba a los demás.
 */
export async function runQueue(
  store: QueueStore,
  send: (profileId: string, event: NotifyEvent) => Promise<void>,
  limit: number,
): Promise<{ sent: number; failed: number }> {
  const rows = await store.claim(limit);
  let sent = 0;
  let failed = 0;

  async function processRow(row: QueueRow): Promise<void> {
    const event = eventFromQueueRow(row.event, row.payload);
    let error: string | null = null;
    if (!event) {
      error = `Aviso no reconocido: ${row.event}`;
    } else {
      try {
        await send(row.profile_id, event);
      } catch (cause) {
        error = errorText(cause);
      }
    }

    try {
      await store.finish(row.id, error === null ? null : error.slice(0, MAX_ERROR_LENGTH));
    } catch (cause) {
      // Si no se puede cerrar, la fila vuelve a salir en la próxima vuelta; mejor contarla como fallo.
      console.error(`[avisos] No se pudo cerrar el aviso ${row.id}: ${errorText(cause)}`);
      failed++;
      return;
    }
    if (error === null) sent++;
    else failed++;
  }

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    await Promise.all(rows.slice(i, i + CONCURRENCY).map(processRow));
  }
  return { sent, failed };
}
