import { describe, expect, test } from "vitest";
import { suggestedTotal } from "./pricing";

describe("suggestedTotal", () => {
  test("multiplica kg por precio en venta", () => {
    expect(suggestedTotal(40, 0.2, "venta")).toBe(8);
  });

  test("redondea a centavos", () => {
    expect(suggestedTotal(33.3, 0.18, "venta")).toBe(5.99);
  });

  test("es cero en donación y trueque", () => {
    expect(suggestedTotal(40, 0.2, "donacion")).toBe(0);
    expect(suggestedTotal(40, 0.2, "trueque")).toBe(0);
  });
});
