import "server-only";

import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";

import { createPushChannel, readVapidConfig } from "./push-channel";

// El aviso de un lote pierde sentido con las horas: si el teléfono está apagado, mejor que expire.
const TTL_SECONDS = 6 * 60 * 60;
const TIMEOUT_MS = 10_000;

/**
 * Canal push (Web Push con llaves VAPID). Las suscripciones se leen con el cliente de servicio,
 * porque quien envía no es la persona avisada. El cliente se crea al usarlo, no al importar el
 * módulo, para que el build no dependa de las variables de entorno.
 */
export const pushChannel = createPushChannel({
  notConfigured() {
    const config = readVapidConfig(process.env);
    return "missing" in config ? `Faltan las llaves de los avisos push (${config.missing.join(", ")})` : null;
  },

  async devices(profileId) {
    const { data, error } = await createAdminClient()
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("profile_id", profileId);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async remove(endpoint) {
    const { error } = await createAdminClient().from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) throw new Error(error.message);
  },

  async send(device, payload) {
    const config = readVapidConfig(process.env);
    if ("missing" in config) throw new Error("Faltan las llaves de los avisos push");
    await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, payload, {
      vapidDetails: { subject: config.subject, publicKey: config.publicKey, privateKey: config.privateKey },
      TTL: TTL_SECONDS,
      urgency: "high",
      timeout: TIMEOUT_MS,
    });
  },
});
