// Lógica pura de "¿este teléfono puede recibir avisos?". El navegador se mira en el componente
// (use-push-device.ts); aquí solo se decide, para probarlo sin navegador.

export type PushEnv = {
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  isIos: boolean;
  /** La app está instalada y abierta desde la pantalla de inicio. */
  isStandalone: boolean;
  /** NEXT_PUBLIC_VAPID_PUBLIC_KEY. */
  publicKey: string | undefined;
  permission: NotificationPermission;
};

export type PushSupport =
  /** Falta la llave pública: el administrador todavía no configuró los avisos. */
  | "unconfigured"
  /** iPhone: los avisos solo funcionan con la app instalada en la pantalla de inicio. */
  | "needs-install"
  | "unsupported"
  /** La persona negó el permiso en el navegador; solo ella puede cambiarlo. */
  | "blocked"
  | "ready";

export function pushSupport(env: PushEnv): PushSupport {
  if (!env.publicKey?.trim()) return "unconfigured";
  // En Safari de iPhone, PushManager ni existe hasta que la app se instala: se dice antes que "no soportado".
  if (env.isIos && !env.isStandalone) return "needs-install";
  if (!env.hasServiceWorker || !env.hasPushManager || !env.hasNotification) return "unsupported";
  if (env.permission === "denied") return "blocked";
  return "ready";
}

/** iPhone, iPad o iPod. Los iPad nuevos se presentan como Mac, pero a diferencia de una Mac tienen pantalla táctil. */
export function isIosDevice(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true;
  return platform === "MacIntel" && maxTouchPoints > 1;
}

/** La llave pública VAPID (base64 URL) en bytes, como la pide `pushManager.subscribe`. */
export function applicationServerKey(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob((base64Url + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** ¿La suscripción que ya existe se hizo con esta misma llave? Si no (se cambiaron las llaves), hay que rehacerla. */
export function sameKey(existing: ArrayBuffer | null, key: Uint8Array): boolean {
  if (!existing) return false;
  const bytes = new Uint8Array(existing);
  return bytes.length === key.length && bytes.every((byte, i) => byte === key[i]);
}
