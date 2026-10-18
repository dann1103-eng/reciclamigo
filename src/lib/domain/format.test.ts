import { describe, expect, test } from "vitest";
import { formatDistance, formatKg, formatUSD } from "./format";

describe("formatKg", () => {
  test("muestra kg con separador de miles es-SV", () => {
    expect(formatKg(40)).toBe("40 kg");
    expect(formatKg(1250.5)).toBe("1,250.5 kg");
  });
});

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
