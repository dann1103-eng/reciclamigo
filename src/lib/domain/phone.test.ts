import { describe, expect, test } from "vitest";

import { normalizeSvPhone } from "./phone";

describe("normalizeSvPhone", () => {
  test("ocho dígitos van con el prefijo de El Salvador", () => {
    expect(normalizeSvPhone("70000101")).toBe("50370000101");
    expect(normalizeSvPhone("7000-0101")).toBe("50370000101");
  });

  test("acepta +503, espacios y 00503", () => {
    expect(normalizeSvPhone("+503 7000 0101")).toBe("50370000101");
    expect(normalizeSvPhone("00503 7000-0101")).toBe("50370000101");
    expect(normalizeSvPhone("50370000101")).toBe("50370000101");
  });

  test("vacío o sin dígitos es null", () => {
    expect(normalizeSvPhone("")).toBeNull();
    expect(normalizeSvPhone(null)).toBeNull();
    expect(normalizeSvPhone("sin número")).toBeNull();
  });
});
