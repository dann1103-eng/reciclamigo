import { describe, expect, test } from "vitest";
import { co2eAvoidedKg, landfillM3Freed } from "./impact";

describe("impacto ambiental", () => {
  test("CO2e evitado usa el factor de la propuesta (180 t → 360 tCO2e)", () => {
    expect(co2eAvoidedKg(180_000)).toBe(360_000);
  });

  test("m³ de vertedero liberados usa 3 m³ por tonelada (180 t → 540 m³)", () => {
    expect(landfillM3Freed(180_000)).toBe(540);
    expect(landfillM3Freed(500)).toBe(1.5);
  });
});
