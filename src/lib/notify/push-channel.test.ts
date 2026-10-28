import { describe, expect, test } from "vitest";

import { createPushChannel, readVapidConfig, type PushDevice } from "./push-channel";
import type { Message } from "./types";

const message: Message = { title: "Lote de PET a 1.5 km", body: "Comedor La Ceiba · 100 lb (1 qq)", url: "/reciclador?lote=1", tag: "lote-1" };

const device = (n: number): PushDevice => ({ endpoint: `https://push.example/${n}`, p256dh: `key-${n}`, auth: `auth-${n}` });

class PushError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
  }
}

function setup(
  options: { devices?: PushDevice[]; failures?: Record<string, Error>; notConfigured?: string | null; devicesError?: Error } = {},
) {
  const sent: { endpoint: string; payload: string }[] = [];
  const removed: string[] = [];
  const channel = createPushChannel({
    notConfigured: () => options.notConfigured ?? null,
    devices: async () => {
      if (options.devicesError) throw options.devicesError;
      return options.devices ?? [];
    },
    remove: async (endpoint) => {
      removed.push(endpoint);
    },
    send: async (target, payload) => {
      const failure = options.failures?.[target.endpoint];
      if (failure) throw failure;
      sent.push({ endpoint: target.endpoint, payload });
    },
  });
  return { channel, sent, removed };
}

describe("canal push", () => {
  test("manda el aviso a todos los dispositivos de la persona, con título, cuerpo, url y tag", async () => {
    const { channel, sent } = setup({ devices: [device(1), device(2)] });
    await expect(channel.send("user-1", message)).resolves.toEqual({ status: "sent", delivered: 2 });
    expect(sent.map((s) => s.endpoint)).toEqual([device(1).endpoint, device(2).endpoint]);
    expect(JSON.parse(sent[0].payload)).toEqual(message);
  });

  test("sin llaves no lanza: responde 'no configurado' y no manda nada", async () => {
    const { channel, sent } = setup({ notConfigured: "Faltan las llaves VAPID", devices: [device(1)] });
    await expect(channel.send("user-1", message)).resolves.toEqual({ status: "not_configured", reason: "Faltan las llaves VAPID" });
    expect(sent).toEqual([]);
  });

  test("sin dispositivos: no_devices", async () => {
    const { channel } = setup({ devices: [] });
    await expect(channel.send("user-1", message)).resolves.toEqual({ status: "no_devices" });
  });

  test("un dispositivo vencido (404 o 410) se borra y no frena a los demás", async () => {
    const { channel, sent, removed } = setup({
      devices: [device(1), device(2), device(3)],
      failures: { [device(1).endpoint]: new PushError("gone", 410), [device(2).endpoint]: new PushError("not found", 404) },
    });
    await expect(channel.send("user-1", message)).resolves.toEqual({ status: "sent", delivered: 1 });
    expect(removed.sort()).toEqual([device(1).endpoint, device(2).endpoint]);
    expect(sent.map((s) => s.endpoint)).toEqual([device(3).endpoint]);
  });

  test("si todos los dispositivos estaban vencidos, queda sin dispositivos (no se reintenta)", async () => {
    const { channel, removed } = setup({ devices: [device(1)], failures: { [device(1).endpoint]: new PushError("gone", 410) } });
    await expect(channel.send("user-1", message)).resolves.toEqual({ status: "no_devices" });
    expect(removed).toEqual([device(1).endpoint]);
  });

  test("un dispositivo caído por otro motivo no frena a los demás, y no se borra", async () => {
    const { channel, sent, removed } = setup({
      devices: [device(1), device(2)],
      failures: { [device(1).endpoint]: new PushError("busy", 503) },
    });
    await expect(channel.send("user-1", message)).resolves.toEqual({ status: "sent", delivered: 1 });
    expect(removed).toEqual([]);
    expect(sent.map((s) => s.endpoint)).toEqual([device(2).endpoint]);
  });

  test("si ningún dispositivo lo recibió y hubo errores reales, es un fallo para reintentar", async () => {
    const { channel } = setup({
      devices: [device(1), device(2)],
      failures: { [device(1).endpoint]: new PushError("busy", 503), [device(2).endpoint]: new Error("Socket timeout") },
    });
    const result = await channel.send("user-1", message);
    expect(result.status).toBe("failed");
    expect(result.status === "failed" && result.error).toMatch(/503/);
    expect(result.status === "failed" && result.error).toMatch(/Socket timeout/);
  });

  test("si no se pueden leer los dispositivos, es un fallo (no se pierde el aviso)", async () => {
    const { channel } = setup({ devicesError: new Error("fetch failed") });
    await expect(channel.send("user-1", message)).resolves.toEqual({
      status: "failed",
      error: "No se pudieron leer los dispositivos: fetch failed",
    });
  });

  test("si falla el borrado de un dispositivo vencido, el envío sigue", async () => {
    const channel = createPushChannel({
      notConfigured: () => null,
      devices: async () => [device(1), device(2)],
      remove: async () => {
        throw new Error("sin base");
      },
      send: async (target) => {
        if (target.endpoint === device(1).endpoint) throw new PushError("gone", 410);
      },
    });
    await expect(channel.send("user-1", message)).resolves.toEqual({ status: "sent", delivered: 1 });
  });
});

describe("readVapidConfig", () => {
  test("con las tres variables devuelve la configuración", () => {
    expect(
      readVapidConfig({ NEXT_PUBLIC_VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv", VAPID_SUBJECT: "mailto:hola@reciclamigo.app" }),
    ).toEqual({ publicKey: "pub", privateKey: "priv", subject: "mailto:hola@reciclamigo.app" });
  });

  test("si falta alguna (o está vacía), dice cuáles faltan", () => {
    expect(readVapidConfig({ NEXT_PUBLIC_VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "  " })).toEqual({
      missing: ["VAPID_PRIVATE_KEY", "VAPID_SUBJECT"],
    });
  });
});
