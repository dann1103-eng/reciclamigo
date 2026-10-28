import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { notify } from "./index";
import { runQueue, type QueueStore } from "./queue-runner";

/**
 * Saca la cola de avisos (`notification_queue`) con los canales de `notify()`. La base decide el
 * orden (cada aviso trae su retraso por destinatario) y lleva la cuenta de intentos: aquí solo se
 * reclaman los vencidos, se mandan y se cierran. Lo llaman los dos cron de Vercel.
 */
export async function processDueNotifications(limit = 50): Promise<{ sent: number; failed: number }> {
  const supabase = createAdminClient();

  const store: QueueStore = {
    async claim(n) {
      const { data, error } = await supabase.rpc("claim_due_notifications", { p_limit: n });
      if (error) throw new Error(`No se pudo leer la cola de avisos: ${error.message}`);
      return data ?? [];
    },
    async finish(id, error) {
      const { error: rpcError } = await supabase.rpc("finish_notification", { p_id: id, p_error: error });
      if (rpcError) throw new Error(rpcError.message);
    },
  };

  return runQueue(store, notify, limit);
}
