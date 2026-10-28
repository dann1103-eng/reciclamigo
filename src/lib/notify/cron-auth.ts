import { createHash, timingSafeEqual } from "node:crypto";

export type CronAuth = { ok: true } | { ok: false; status: 401 | 500; message: string };

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * Vercel Cron manda `Authorization: Bearer <CRON_SECRET>`. Sin secreto configurado la ruta
 * responde 500 (queda cerrada, nunca abierta); con uno distinto, 401. La comparación no
 * depende de cuánto se parezca el valor al secreto.
 */
export function checkCronAuth(authorization: string | null, secret: string | undefined): CronAuth {
  if (!secret || secret.trim() === "") {
    return { ok: false, status: 500, message: "Falta configurar CRON_SECRET en el servidor: la tarea programada está desactivada." };
  }
  const expected = `Bearer ${secret}`;
  if (!authorization || !timingSafeEqual(digest(authorization), digest(expected))) {
    return { ok: false, status: 401, message: "No autorizado." };
  }
  return { ok: true };
}
