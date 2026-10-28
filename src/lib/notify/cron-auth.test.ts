import { describe, expect, test } from "vitest";

import { checkCronAuth } from "./cron-auth";

describe("checkCronAuth", () => {
  test("con el secreto correcto en Bearer, pasa", () => {
    expect(checkCronAuth("Bearer s3creto", "s3creto")).toEqual({ ok: true });
  });

  test("sin CRON_SECRET responde 500 con un mensaje claro (nunca queda abierta)", () => {
    for (const secret of [undefined, "", "   "]) {
      const result = checkCronAuth("Bearer cualquiera", secret);
      expect(result).toMatchObject({ ok: false, status: 500 });
      expect(result.ok === false && result.message).toMatch(/CRON_SECRET/);
    }
    // aunque no manden encabezado
    expect(checkCronAuth(null, undefined)).toMatchObject({ ok: false, status: 500 });
  });

  test("sin encabezado, con otro esquema o con otro secreto: 401", () => {
    expect(checkCronAuth(null, "s3creto")).toMatchObject({ ok: false, status: 401 });
    expect(checkCronAuth("", "s3creto")).toMatchObject({ ok: false, status: 401 });
    expect(checkCronAuth("s3creto", "s3creto")).toMatchObject({ ok: false, status: 401 });
    expect(checkCronAuth("Basic s3creto", "s3creto")).toMatchObject({ ok: false, status: 401 });
    expect(checkCronAuth("Bearer otro", "s3creto")).toMatchObject({ ok: false, status: 401 });
    expect(checkCronAuth("Bearer s3creto-y-mas", "s3creto")).toMatchObject({ ok: false, status: 401 });
    expect(checkCronAuth("Bearer ", "s3creto")).toMatchObject({ ok: false, status: 401 });
  });

  test("el 401 no revela el secreto", () => {
    const result = checkCronAuth("Bearer otro", "s3creto");
    expect(JSON.stringify(result)).not.toContain("s3creto");
  });
});
