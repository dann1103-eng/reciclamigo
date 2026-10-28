import { describe, expect, test } from "vitest";

import { runQueue, type QueueRow, type QueueStore } from "./queue-runner";
import type { NotifyEvent } from "./types";

const LOT = "11111111-1111-4111-8111-111111111111";
const PICKUP = "22222222-2222-4222-8222-222222222222";

const nearby = (id: string, profile = "user-1"): QueueRow => ({
  id,
  profile_id: profile,
  event: "lote_cercano",
  payload: { lot_id: LOT, polymer_code: "PET", estimated_lb: 100, generator_name: "Comedor La Ceiba", distance_m: 1500 },
  attempts: 1,
});

function fakeStore(rows: QueueRow[], options: { failFinishFor?: string } = {}) {
  const finished = new Map<string, string | null>();
  const claims: number[] = [];
  const store: QueueStore = {
    async claim(limit) {
      claims.push(limit);
      return rows;
    },
    async finish(id, error) {
      if (id === options.failFinishFor) throw new Error("sin base");
      finished.set(id, error);
    },
  };
  return { store, finished, claims };
}

describe("runQueue", () => {
  test("envía cada aviso vencido y lo marca enviado (sin error)", async () => {
    const { store, finished, claims } = fakeStore([nearby("a"), nearby("b", "user-2")]);
    const delivered: { profileId: string; event: NotifyEvent }[] = [];
    const result = await runQueue(store, async (profileId, event) => void delivered.push({ profileId, event }), 20);

    expect(result).toEqual({ sent: 2, failed: 0 });
    expect(claims).toEqual([20]);
    expect(finished.get("a")).toBeNull();
    expect(finished.get("b")).toBeNull();
    expect(delivered.map((d) => d.profileId).sort()).toEqual(["user-1", "user-2"]);
    expect(delivered[0].event).toMatchObject({ type: "lote_cercano", lotId: LOT, polymerCode: "PET", distanceM: 1500 });
  });

  test("sin avisos vencidos no hace nada", async () => {
    const { store } = fakeStore([]);
    await expect(runQueue(store, async () => {}, 50)).resolves.toEqual({ sent: 0, failed: 0 });
  });

  test("si notify falla, esa fila se cierra con el motivo y las demás siguen", async () => {
    const { store, finished } = fakeStore([nearby("a"), nearby("b", "user-2"), nearby("c", "user-3")]);
    const result = await runQueue(
      store,
      async (profileId) => {
        if (profileId === "user-2") throw new Error("push: Push respondió 503");
      },
      50,
    );
    expect(result).toEqual({ sent: 2, failed: 1 });
    expect(finished.get("a")).toBeNull();
    expect(finished.get("b")).toBe("push: Push respondió 503");
    expect(finished.get("c")).toBeNull();
  });

  test("una persona sin dispositivos: notify no lanza y la fila queda enviada", async () => {
    const { store, finished } = fakeStore([nearby("a")]);
    // notify resuelve cuando no hay nada que entregar (el lote igual aparece en el mapa)
    await expect(runQueue(store, async () => {}, 50)).resolves.toEqual({ sent: 1, failed: 0 });
    expect(finished.get("a")).toBeNull();
  });

  test("un evento que no se entiende se cierra con error y no llama a notify", async () => {
    const rows: QueueRow[] = [{ id: "x", profile_id: "user-1", event: "algo_raro", payload: {}, attempts: 1 }];
    const { store, finished } = fakeStore(rows);
    let calls = 0;
    const result = await runQueue(store, async () => void calls++, 50);
    expect(result).toEqual({ sent: 0, failed: 1 });
    expect(calls).toBe(0);
    expect(finished.get("x")).toMatch(/algo_raro/);
  });

  test("un payload incompleto también se descarta con su motivo", async () => {
    const rows: QueueRow[] = [
      { id: "x", profile_id: "user-1", event: "entrega_propuesta", payload: { pickup_id: PICKUP }, attempts: 1 },
    ];
    const { store, finished } = fakeStore(rows);
    const result = await runQueue(store, async () => {}, 50);
    expect(result).toEqual({ sent: 0, failed: 1 });
    expect(finished.get("x")).toMatch(/entrega_propuesta/);
  });

  test("si no se puede cerrar una fila, cuenta como fallo y las demás siguen", async () => {
    const { store, finished } = fakeStore([nearby("a"), nearby("b", "user-2")], { failFinishFor: "a" });
    const result = await runQueue(store, async () => {}, 50);
    expect(result).toEqual({ sent: 1, failed: 1 });
    expect(finished.has("a")).toBe(false);
    expect(finished.get("b")).toBeNull();
  });

  test("el motivo guardado es corto aunque el error sea enorme", async () => {
    const { store, finished } = fakeStore([nearby("a")]);
    await runQueue(
      store,
      async () => {
        throw new Error("x".repeat(5000));
      },
      50,
    );
    expect((finished.get("a") ?? "").length).toBeLessThanOrEqual(500);
  });

  test("procesa muchas filas sin perder ninguna", async () => {
    const rows = Array.from({ length: 23 }, (_, i) => nearby(`row-${i}`, `user-${i}`));
    const { store, finished } = fakeStore(rows);
    const result = await runQueue(store, async () => {}, 50);
    expect(result).toEqual({ sent: 23, failed: 0 });
    expect(finished.size).toBe(23);
  });
});
