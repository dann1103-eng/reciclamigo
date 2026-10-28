import { describe, expect, test } from "vitest";

import { iconSizeFromParam, isMaskableParam } from "./icon-size";

describe("iconSizeFromParam", () => {
  test("solo existen los íconos de 192 y 512", () => {
    expect(iconSizeFromParam("192")).toBe(192);
    expect(iconSizeFromParam("512")).toBe(512);
  });

  test("cualquier otro tamaño o texto no existe", () => {
    for (const raw of ["", "0", "64", "180", "193", "1024", "192.0", "0192", "192px", "abc", "-192", " 192", "1e3"]) {
      expect(iconSizeFromParam(raw)).toBeNull();
    }
  });
});

describe("isMaskableParam", () => {
  test("solo '1' pide la variante maskable", () => {
    expect(isMaskableParam("1")).toBe(true);
    expect(isMaskableParam(null)).toBe(false);
    expect(isMaskableParam("")).toBe(false);
    expect(isMaskableParam("0")).toBe(false);
    expect(isMaskableParam("true")).toBe(false);
  });
});
