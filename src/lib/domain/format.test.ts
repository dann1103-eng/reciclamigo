import { describe, expect, test } from "vitest";
import { formatDistance, formatPricePerLb, formatUSD } from "./format";

describe("formatDistance", () => {
  test("usa metros bajo 1 km y km con un decimal arriba", () => {
    expect(formatDistance(850)).toBe("850 m");
    expect(formatDistance(2340)).toBe("2.3 km");
  });
});

describe("formatUSD", () => {
  test("formatea dólares con centavos", () => {
    expect(formatUSD(1250.5)).toBe("$1,250.50");
  });
});

describe("formatPricePerLb", () => {
  test("precio de referencia por libra", () => {
    expect(formatPricePerLb(0.09)).toBe("$0.09/lb");
    expect(formatPricePerLb(0.08)).toBe("$0.08/lb");
  });

  test("muestra un tercer decimal solo si hace falta", () => {
    expect(formatPricePerLb(0.095)).toBe("$0.095/lb");
  });
});
