import { describe, expect, test } from "vitest";

import { loadCertificate, type CertificateRpc } from "./load";

const cert = { code: "RCA-2026-0A1B2C", confirmed_kg: 35.5 };

function fakeClient(result: { data: unknown; error: { message: string } | null }) {
  const calls: string[] = [];
  const client: CertificateRpc = {
    rpc: async (_fn, args) => {
      calls.push(args.p_code);
      return result as never;
    },
  };
  return { client, calls };
}

describe("loadCertificate", () => {
  test("devuelve el certificado cuando existe", async () => {
    const { client } = fakeClient({ data: [cert], error: null });
    await expect(loadCertificate(client, "RCA-2026-0A1B2C")).resolves.toEqual(cert);
  });

  test("null si el código no existe o está mal escrito (sin consultar la base)", async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    await expect(loadCertificate(client, "RCA-2026-000000")).resolves.toBeNull();
    await expect(loadCertificate(client, "RCA-2026-XXXXXX")).resolves.toBeNull();
    expect(calls).toEqual(["RCA-2026-000000"]);
  });

  test("si la base falla, lanza en vez de decir que no existe", async () => {
    const { client } = fakeClient({ data: null, error: { message: "fetch failed" } });
    await expect(loadCertificate(client, "RCA-2026-0A1B2C")).rejects.toThrow("No se pudo verificar el certificado");
  });
});
