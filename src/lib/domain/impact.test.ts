import { describe, expect, test } from "vitest";
import { co2AvoidedKg, landfillM3Freed } from "./impact";

// impact.ts reexporta lo de units.ts con los nombres que ya usan las pantallas de impacto.
describe("impacto ambiental", () => {
  test("CO₂ evitado: 100 lb de plástico = 45.36 kg → 90.7 kg de CO₂ con factor 2.0", () => {
    expect(co2AvoidedKg(100, 2)).toBeCloseTo(90.72, 2);
  });

  test("m³ de vertedero liberados usa 3 m³ por tonelada", () => {
    expect(landfillM3Freed(2204.62)).toBeCloseTo(3, 2);
  });
});
