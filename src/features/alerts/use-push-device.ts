"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import { removePushSubscription, savePushSubscription } from "./actions";
import { applicationServerKey, isIosDevice, pushSupport, sameKey, type PushEnv, type PushSupport } from "./push-support";

/** "checking" mientras se mira el navegador; luego lo que diga `pushSupport`, o si está encendido en este teléfono. */
export type PushDeviceState = "checking" | Exclude<PushSupport, "ready"> | "off" | "on";

// Next pone esta variable en el código al compilar. Sin ella los avisos no están configurados.
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

const GENERIC_ERROR = "No se pudieron cambiar los avisos. Revisa la conexión e inténtalo de nuevo.";

function readEnv(): PushEnv {
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    hasServiceWorker: "serviceWorker" in navigator,
    hasPushManager: "PushManager" in window,
    hasNotification: "Notification" in window,
    isIos: isIosDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints),
    isStandalone: window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true,
    publicKey: PUBLIC_KEY,
    permission: "Notification" in window ? Notification.permission : "default",
  };
}

/** La suscripción de este navegador, si ya la hay. No registra nada. */
async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

/** ¿Este dispositivo está guardado a nombre de quien tiene la sesión? (RLS: solo ve los suyos). */
async function isSavedForMe(endpoint: string): Promise<boolean> {
  const { data, error } = await createClient()
    .from("push_subscriptions")
    .select("endpoint")
    .eq("endpoint", endpoint)
    .maybeSingle();
  // Sin conexión no se insiste: el aviso sigue activo mientras el navegador lo tenga.
  return error ? true : data !== null;
}

async function detect(): Promise<PushDeviceState> {
  const support = pushSupport(readEnv());
  if (support !== "ready") return support;
  try {
    const subscription = await currentSubscription();
    if (!subscription || Notification.permission !== "granted") return "off";
    // Un teléfono compartido puede estar guardado a nombre de otra persona: aquí se ofrece activarlo.
    return (await isSavedForMe(subscription.endpoint)) ? "on" : "off";
  } catch {
    return "off";
  }
}

/**
 * Estado de los avisos push en este teléfono y las dos acciones: activar (service worker, permiso,
 * suscripción y guardado en el servidor) y desactivar. Solo para componentes de cliente.
 */
export function usePushDevice() {
  const [state, setState] = useState<PushDeviceState>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void detect().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    if (!PUBLIC_KEY) return;
    setBusy(true);
    setError(null);
    try {
      // Lo primero, sin esperar nada antes: Safari solo deja pedir el permiso dentro del toque.
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setState("blocked");
        return;
      }
      if (permission !== "granted") return; // cerró el cuadro sin elegir: puede volver a intentarlo

      await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      const registration = await navigator.serviceWorker.ready;

      const key = applicationServerKey(PUBLIC_KEY);
      let subscription = await registration.pushManager.getSubscription();
      if (subscription && !sameKey(subscription.options.applicationServerKey, key)) {
        await subscription.unsubscribe(); // se cambiaron las llaves del servidor: hay que suscribirse de nuevo
        subscription = null;
      }
      subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setError("Este navegador no dio una suscripción completa. Prueba con otro.");
        return;
      }
      const saved = await savePushSubscription({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      if (!saved.ok) {
        setError(saved.error);
        return;
      }
      setState("on");
    } catch {
      if ("Notification" in window && Notification.permission === "denied") setState("blocked");
      else setError(GENERIC_ERROR);
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const subscription = await currentSubscription();
      if (subscription) {
        // Primero el servidor: si falla, el aviso sigue activo y no queda a medias.
        const removed = await removePushSubscription(subscription.endpoint);
        if (!removed.ok) {
          setError(removed.error);
          return;
        }
        await subscription.unsubscribe();
      }
      setState("off");
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, error, enable, disable };
}
