import { describe, expect, test } from "vitest";

import { loadCircular, type CircularRpc } from "./load";

const row = {
  business_name: "Café La Esquina",
  org_type: "Restaurante",
  total_lb: 250.5,
  co2_kg: 227.3,
  deliveries: 4,
  last_delivery_at: "2026-10-20T15:00:00Z",
};

function fakeClient(result: { data: unknown; error: { message: string } | null }) {
  const calls: string[] = [];
  const client: CircularRpc = {
    rpc: async (_fn, args) => {
      calls.push(args.p_slug);
      return result as never;
    },
  };
  return { client, calls };
}

describe("loadCircular", () => {
  test("devuelve las cifras públicas cuando la insignia existe", async () => {
    const { client } = fakeClient({ data: [row], error: null });
    await expect(loadCircular(client, "cafe-la-esquina")).resolves.toEqual({
      businessName: "Café La Esquina",
      orgType: "Restaurante",
      totalLb: 250.5,
      co2Kg: 227.3,
      deliveries: 4,
      lastDeliveryAt: "2026-10-20T15:00:00Z",
    });
  });

  test("acepta números que lleguen como texto (numeric de Postgres)", async () => {
    const { client } = fakeClient({ data: [{ ...row, total_lb: "250.50", co2_kg: "227.30" }], error: null });
    const data = await loadCircular(client, "cafe-la-esquina");
    expect(data?.totalLb).toBe(250.5);
    expect(data?.co2Kg).toBe(227.3);
  });

  test("null si no hay filas (no existe, sin plan activo o sin entregas confirmadas)", async () => {
    const { client } = fakeClient({ data: [], error: null });
    await expect(loadCircular(client, "no-existe")).resolves.toBeNull();
  });

  test("null sin consultar la base si el slug es inválido", async () => {
    const { client, calls } = fakeClient({ data: [row], error: null });
    await expect(loadCircular(client, "../admin")).resolves.toBeNull();
    await expect(loadCircular(client, "Cafe")).resolves.toBeNull();
    expect(calls).toEqual([]);
  });

  test("si la base falla, lanza en vez de decir que no existe", async () => {
    const { client } = fakeClient({ data: null, error: { message: "fetch failed" } });
    await expect(loadCircular(client, "cafe-la-esquina")).rejects.toThrow("No se pudo cargar la insignia");
  });
});
