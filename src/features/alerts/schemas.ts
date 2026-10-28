import { z } from "zod";

import { POLYMER_CODES, type PolymerCode } from "@/lib/domain/polymers";

// Los servicios de push (Google, Apple, Mozilla) siempre dan una url https; 2,048 es de sobra.
export const endpointSchema = z
  .url({ protocol: /^https$/, error: "El teléfono no mandó una suscripción válida" })
  .max(2048, "El teléfono no mandó una suscripción válida");

const key = (max: number) =>
  z
    .string({ error: "El teléfono no mandó una suscripción válida" })
    .min(1, "El teléfono no mandó una suscripción válida")
    .max(max, "El teléfono no mandó una suscripción válida");

/** Lo que arma el navegador al suscribirse (`PushSubscription.toJSON()`). */
export const pushSubscriptionSchema = z.object({
  endpoint: endpointSchema,
  keys: z.object({ p256dh: key(256), auth: key(128) }, { error: "El teléfono no mandó una suscripción válida" }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

/**
 * Preferencias de aviso del reciclador. `polymers: null` = todos los tipos. Que el radio sea uno de los
 * configurados lo valida la base (set_alert_prefs), que lee `radios_aviso_km`.
 */
export const alertPrefsSchema = z.object({
  radiusKm: z
    .number({ error: "Elige un radio" })
    .int("Elige un radio")
    .positive("Elige un radio"),
  polymers: z
    .array(z.enum(POLYMER_CODES, { error: "Elige un tipo de plástico válido" }))
    .min(1, "Elige al menos un tipo de plástico")
    .nullable(),
  enabled: z.boolean({ error: "Indica si quieres recibir avisos" }),
});

export type AlertPrefsInput = z.infer<typeof alertPrefsSchema>;

/**
 * Elegir los cinco tipos es lo mismo que "todos": se guarda null para que un tipo nuevo, si algún día
 * se agrega, también llegue. Quita repetidos y conserva el orden.
 */
export function normalizePolymers(polymers: PolymerCode[] | null): PolymerCode[] | null {
  if (polymers === null) return null;
  const unique = [...new Set(polymers)];
  return POLYMER_CODES.every((code) => unique.includes(code)) ? null : unique;
}
