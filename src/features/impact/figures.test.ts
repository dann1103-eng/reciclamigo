import { describe, expect, test } from "vitest";

import { impactFigures } from "./figures";

const row = {
  profile_id: "p",
  role: "generador" as const,
  display_name: "Café La Esquina",
  org_type: "Restaurante",
  municipality: "Santa Ana",
  verified: false,
  lots_published: 5,
  completed_count: 4,
  completed_lb: 250,
  total_amount: 22.5,
  rating_avg: null,
  rating_count: 0,
  reputation_tier: "en_marcha" as const,
  reputation_score: 0.8,
};

describe("impactFigures", () => {
  test("libras, CO₂ evitado con el factor de la configuración, ingresos y entregas", () => {
    const f = impactFigures(row, 2);
    expect(f.lb).toBe(250);
    // 250 lb = 113.398 kg de plástico; x2 de factor = 226.8 kg de CO₂.
    expect(f.co2Kg).toBeCloseTo(226.8, 1);
    expect(f.income).toBe(22.5);
    expect(f.deliveries).toBe(4);
  });

  test("el factor viene de la configuración, no del código", () => {
    expect(impactFigures(row, 3).co2Kg).toBeCloseTo(340.2, 1);
  });

  test("acepta números que lleguen como texto (numeric de Postgres)", () => {
    const f = impactFigures({ ...row, completed_lb: "250.00" as never, total_amount: "22.50" as never }, 2);
    expect(f.lb).toBe(250);
    expect(f.income).toBe(22.5);
  });

  test("sin fila o con valores nulos, todo en cero", () => {
    expect(impactFigures(null, 2)).toEqual({ lb: 0, co2Kg: 0, income: 0, deliveries: 0 });
    expect(impactFigures({ ...row, completed_lb: null, total_amount: null, completed_count: null }, 2)).toEqual({
      lb: 0,
      co2Kg: 0,
      income: 0,
      deliveries: 0,
    });
  });
});
