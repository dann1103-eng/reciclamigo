import { describe, expect, test } from "vitest";

import { isPrioritized, REPUTATION_LABEL, reputationLine } from "./reputation";

describe("reputación", () => {
  test("la reputación crece con entregas confirmadas: cuatro niveles con nombre", () => {
    expect(REPUTATION_LABEL).toEqual({
      nuevo: "Nuevo",
      en_marcha: "En marcha",
      confiable: "Confiable",
      destacado: "Destacado",
    });
  });

  test("solo confiable y destacado tienen prioridad en los avisos", () => {
    expect(isPrioritized("nuevo")).toBe(false);
    expect(isPrioritized("en_marcha")).toBe(false);
    expect(isPrioritized("confiable")).toBe(true);
    expect(isPrioritized("destacado")).toBe(true);
  });

  test("la línea para el perfil y la reserva junta nivel, entregas y estrellas", () => {
    expect(reputationLine({ tier: "confiable", completedCount: 12, ratingAvg: 4.83, ratingCount: 9 })).toBe(
      "Confiable · 12 entregas confirmadas · 4.8 ★ (9)",
    );
  });

  test("singular, sin calificaciones y sin entregas", () => {
    expect(reputationLine({ tier: "en_marcha", completedCount: 1, ratingAvg: null, ratingCount: 0 })).toBe(
      "En marcha · 1 entrega confirmada · Sin calificaciones todavía",
    );
    expect(reputationLine({ tier: "nuevo", completedCount: 0, ratingAvg: null, ratingCount: 0 })).toBe(
      "Nuevo · Sin entregas confirmadas · Sin calificaciones todavía",
    );
  });
});
