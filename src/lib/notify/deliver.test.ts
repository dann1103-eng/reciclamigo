import { describe, expect, test } from "vitest";

import type { ChannelResult, NotifyChannel } from "./channels";
import { deliver } from "./deliver";
import type { Message } from "./types";

const message: Message = { title: "Lote de PET a 1.5 km", body: "Comedor La Ceiba · 100 lb (1 qq)", url: "/reciclador", tag: "lote-1" };

function channel(name: string, result: ChannelResult | Error): NotifyChannel & { calls: string[] } {
  const calls: string[] = [];
  return {
    name,
    calls,
    async send(profileId) {
      calls.push(profileId);
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

describe("deliver", () => {
  test("un canal que envía basta: entregado", async () => {
    const push = channel("push", { status: "sent", delivered: 2 });
    await expect(deliver([push], "user-1", message)).resolves.toEqual({ status: "delivered" });
    expect(push.calls).toEqual(["user-1"]);
  });

  test("sin dispositivos no es un fallo: no hay nada que entregar", async () => {
    await expect(deliver([channel("push", { status: "no_devices" })], "user-1", message)).resolves.toEqual({
      status: "nothing_to_deliver",
    });
  });

  test("sin canales tampoco hay nada que entregar", async () => {
    await expect(deliver([], "user-1", message)).resolves.toEqual({ status: "nothing_to_deliver" });
  });

  test("un canal que falla es un fallo con su nombre y motivo", async () => {
    const outcome = await deliver([channel("push", { status: "failed", error: "Push respondió 503" })], "user-1", message);
    expect(outcome).toEqual({ status: "failed", error: "push: Push respondió 503" });
  });

  test("un canal sin configurar se cuenta como fallo, con el motivo a la vista", async () => {
    const outcome = await deliver(
      [channel("push", { status: "not_configured", reason: "Faltan las llaves VAPID" })],
      "user-1",
      message,
    );
    expect(outcome).toEqual({ status: "failed", error: "push: Faltan las llaves VAPID" });
  });

  test("si un canal lanza una excepción, los demás igual se intentan", async () => {
    const roto = channel("roto", new Error("se cayó"));
    const bueno = channel("push", { status: "sent", delivered: 1 });
    await expect(deliver([roto, bueno], "user-1", message)).resolves.toEqual({ status: "delivered" });
    expect(roto.calls).toHaveLength(1);
    expect(bueno.calls).toHaveLength(1);
  });

  test("si solo hay canales caídos, junta todos los motivos", async () => {
    const outcome = await deliver(
      [channel("a", new Error("se cayó")), channel("b", { status: "failed", error: "sin red" }), channel("c", { status: "no_devices" })],
      "user-1",
      message,
    );
    expect(outcome).toEqual({ status: "failed", error: "a: se cayó; b: sin red" });
  });
});
