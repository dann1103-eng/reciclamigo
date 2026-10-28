import { describe, expect, test } from "vitest";

import { loadVoucher, type VoucherRpc } from "./load";

const voucher = { code: "RCA-2026-0A1B2C", confirmed_lb: 78.26 };

function fakeClient(result: { data: unknown; error: { message: string } | null }) {
  const calls: string[] = [];
  const client: VoucherRpc = {
    rpc: async (_fn, args) => {
      calls.push(args.p_code);
      return result as never;
    },
  };
  return { client, calls };
}

describe("loadVoucher", () => {
  test("devuelve el comprobante cuando existe", async () => {
    const { client } = fakeClient({ data: [voucher], error: null });
    await expect(loadVoucher(client, "RCA-2026-0A1B2C")).resolves.toEqual(voucher);
  });

  test("null si el código no existe o está mal escrito (sin consultar la base)", async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    await expect(loadVoucher(client, "RCA-2026-000000")).resolves.toBeNull();
    await expect(loadVoucher(client, "RCA-2026-XXXXXX")).resolves.toBeNull();
    expect(calls).toEqual(["RCA-2026-000000"]);
  });

  test("si la base falla, lanza en vez de decir que no existe", async () => {
    const { client } = fakeClient({ data: null, error: { message: "fetch failed" } });
    await expect(loadVoucher(client, "RCA-2026-0A1B2C")).rejects.toThrow("No se pudo verificar el comprobante");
  });
});
