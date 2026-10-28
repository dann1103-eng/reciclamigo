"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { firstIssue } from "@/features/lots/schemas";
import { failure, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";

import {
  alertPrefsSchema,
  endpointSchema,
  normalizePolymers,
  pushSubscriptionSchema,
  type AlertPrefsInput,
  type PushSubscriptionInput,
} from "./schemas";

/**
 * Guarda el dispositivo de quien tiene la sesión para mandarle avisos. Si el teléfono ya estaba
 * registrado a nombre de otra persona, pasa a la última que activó los avisos (lo resuelve la base).
 */
export async function savePushSubscription(subscription: PushSubscriptionInput): Promise<ActionResult> {
  const parsed = pushSubscriptionSchema.safeParse(subscription);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const userAgent = (await headers()).get("user-agent");
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: parsed.data.endpoint,
    p_p256dh: parsed.data.keys.p256dh,
    p_auth: parsed.data.keys.auth,
    p_user_agent: userAgent,
  });
  if (error) return failure(error);
  return { ok: true, data: undefined };
}

/** Quita un dispositivo de quien tiene la sesión (solo borra los suyos). */
export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  const parsed = endpointSchema.safeParse(endpoint);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_push_subscription", { p_endpoint: parsed.data });
  if (error) return failure(error);
  return { ok: true, data: undefined };
}

/** Radio, tipos de plástico e interruptor de avisos del reciclador. La base valida que el radio sea uno de los configurados. */
export async function saveAlertPrefs(input: AlertPrefsInput): Promise<ActionResult> {
  const parsed = alertPrefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_alert_prefs", {
    p_radius_km: parsed.data.radiusKm,
    p_polymers: normalizePolymers(parsed.data.polymers),
    p_enabled: parsed.data.enabled,
  });
  if (error) return failure(error);

  revalidatePath("/reciclador/avisos");
  return { ok: true, data: undefined };
}
