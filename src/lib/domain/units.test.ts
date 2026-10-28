import { describe, expect, test } from "vitest";

import {
  co2AvoidedKg,
  formatCo2,
  formatKg,
  formatLb,
  formatLbKg,
  kgToLb,
  landfillM3Freed,
  LB_PER_KG,
  lbToKg,
  lbToQuintales,
} from "./units";

describe("conversiones", () => {
  test("1 kg = 2.20462 lb y 1 lb = 0.45359237 kg", () => {
    expect(LB_PER_KG).toBe(2.20462);
    expect(kgToLb(1)).toBe(2.2);
    expect(kgToLb(40)).toBe(88.18);
    expect(lbToKg(100)).toBe(45.36);
  });

  test("ida y vuelta no pierde más de un centavo de libra", () => {
    expect(lbToKg(kgToLb(40))).toBe(40);
    expect(Math.abs(kgToLb(lbToKg(250)) - 250)).toBeLessThan(0.02);
  });

  test("1 quintal = 100 lb", () => {
    expect(lbToQuintales(250)).toBe(2.5);
    expect(lbToQuintales(100)).toBe(1);
  });
});

describe("formatLb", () => {
  test("bajo 100 lb solo libras", () => {
    expect(formatLb(40)).toBe("40 lb");
    expect(formatLb(99.5)).toBe("99.5 lb");
    expect(formatLb(0)).toBe("0 lb");
  });

  test("desde 100 lb agrega los quintales: 250 lb (2.5 qq)", () => {
    expect(formatLb(100)).toBe("100 lb (1 qq)");
    expect(formatLb(250)).toBe("250 lb (2.5 qq)");
    expect(formatLb(1250.5)).toBe("1,250.5 lb (12.5 qq)");
  });

  test("admite más decimales para comprobantes", () => {
    expect(formatLb(88.18, 2)).toBe("88.18 lb");
    expect(formatLb(88.18)).toBe("88.2 lb");
  });
});

describe("formatLbKg y formatKg", () => {
  test("el reporte muestra libras con los kg entre paréntesis", () => {
    expect(formatLbKg(100)).toBe("100 lb (45.4 kg)");
    expect(formatLbKg(250)).toBe("250 lb (113.4 kg)");
    expect(formatKg(45.359)).toBe("45.4 kg");
  });
});

describe("CO₂", () => {
  test("el factor es masa a masa: 100 lb = 45.36 kg → 90.7 kg de CO₂", () => {
    expect(co2AvoidedKg(100, 2)).toBeCloseTo(90.72, 2);
    expect(formatCo2(co2AvoidedKg(100, 2))).toBe("90.7 kg");
  });

  test("usa el factor que se le pasa (configurable)", () => {
    expect(co2AvoidedKg(100, 3)).toBeCloseTo(136.08, 2);
    expect(co2AvoidedKg(0, 2)).toBe(0);
  });

  test("desde 1,000 kg se muestra en toneladas", () => {
    expect(formatCo2(999.4)).toBe("999.4 kg");
    expect(formatCo2(1500)).toBe("1.5 t");
    expect(formatCo2(360_000)).toBe("360 t");
  });

  test("m³ de vertedero liberados: 3 m³ por tonelada (396,832 lb ≈ 180 t → 540 m³)", () => {
    expect(landfillM3Freed(396_832.5)).toBeCloseTo(540, 0);
    expect(landfillM3Freed(1102.31)).toBeCloseTo(1.5, 2);
  });
});
