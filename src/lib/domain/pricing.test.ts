import { describe, expect, test } from "vitest";
import { suggestedTotal } from "./pricing";

describe("suggestedTotal", () => {
  test("multiplica libras por precio en venta", () => {
    expect(suggestedTotal(100, 0.09, "venta")).toBe(9);
  });

  test("redondea a centavos", () => {
    expect(suggestedTotal(33.3, 0.08, "venta")).toBe(2.66);
  });

  test("es cero en donación y trueque", () => {
    expect(suggestedTotal(40, 0.09, "donacion")).toBe(0);
    expect(suggestedTotal(40, 0.09, "trueque")).toBe(0);
  });
});
