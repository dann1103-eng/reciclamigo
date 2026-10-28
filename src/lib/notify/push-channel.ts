import type { ChannelResult, NotifyChannel } from "./channels";
import { errorText } from "./errors";

/** Un teléfono o navegador suscrito (fila de `push_subscriptions`). */
export type PushDevice = { endpoint: string; p256dh: string; auth: string };

export type PushDeps = {
  /** Por qué el canal no puede enviar (faltan las llaves), o null si está listo. */
  notConfigured: () => string | null;
  devices: (profileId: string) => Promise<PushDevice[]>;
  remove: (endpoint: string) => Promise<void>;
  /** Manda el payload a un dispositivo. Si el servicio de push rechaza, lanza con `statusCode`. */
  send: (device: PushDevice, payload: string) => Promise<void>;
};

export type VapidConfig = { publicKey: string; privateKey: string; subject: string };

/** Lee las llaves VAPID del entorno. Si falta alguna, dice cuáles. */
export function readVapidConfig(env: Record<string, string | undefined>): VapidConfig | { missing: string[] } {
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  const subject = env.VAPID_SUBJECT?.trim();
  if (publicKey && privateKey && subject) return { publicKey, privateKey, subject };

  const missing = [
    ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", publicKey],
    ["VAPID_PRIVATE_KEY", privateKey],
    ["VAPID_SUBJECT", subject],
  ].flatMap(([name, value]) => (value ? [] : [name as string]));
  return { missing };
}

const statusCodeOf = (error: unknown): number | undefined =>
  typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number"
    ? error.statusCode
    : undefined;

/** El servicio de push dice que la suscripción ya no existe (el usuario desinstaló o revocó el permiso). */
const isGone = (error: unknown): boolean => {
  const status = statusCodeOf(error);
  return status === 404 || status === 410;
};

const describeSendError = (error: unknown): string => {
  const status = statusCodeOf(error);
  return status !== undefined ? `Push respondió ${status}` : errorText(error);
};

/**
 * El canal push, sin saber de red ni de base de datos (llegan por `deps`). Un dispositivo caído no
 * frena a los demás: si al menos uno recibe el aviso, está entregado.
 */
export function createPushChannel(deps: PushDeps): NotifyChannel {
  return {
    name: "push",
    async send(profileId, message): Promise<ChannelResult> {
      const reason = deps.notConfigured();
      if (reason) return { status: "not_configured", reason };

      let devices: PushDevice[];
      try {
        devices = await deps.devices(profileId);
      } catch (error) {
        return { status: "failed", error: `No se pudieron leer los dispositivos: ${errorText(error)}` };
      }
      if (devices.length === 0) return { status: "no_devices" };

      const payload = JSON.stringify({ title: message.title, body: message.body, url: message.url, tag: message.tag });

      const outcomes = await Promise.all(
        devices.map(async (device): Promise<{ kind: "sent" } | { kind: "gone" } | { kind: "failed"; error: string }> => {
          try {
            await deps.send(device, payload);
            return { kind: "sent" };
          } catch (error) {
            if (isGone(error)) {
              await deps.remove(device.endpoint).catch(() => undefined);
              return { kind: "gone" };
            }
            return { kind: "failed", error: describeSendError(error) };
          }
        }),
      );

      const delivered = outcomes.filter((o) => o.kind === "sent").length;
      if (delivered > 0) return { status: "sent", delivered };

      const errors = [...new Set(outcomes.flatMap((o) => (o.kind === "failed" ? [o.error] : [])))];
      if (errors.length > 0) return { status: "failed", error: errors.join("; ") };

      // Todos los dispositivos estaban vencidos y ya se borraron: es como no tener ninguno.
      return { status: "no_devices" };
    },
  };
}
