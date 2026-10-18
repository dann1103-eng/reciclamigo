import { describe, expect, test } from "vitest";
import { computeBadges, type ProfileStats } from "./badges";

const base: ProfileStats = {
  role: "generador",
  lotsPublished: 0,
  completedCount: 0,
  completedKg: 0,
  ratingAvg: null,
  ratingCount: 0,
  verified: false,
};
const ids = (s: ProfileStats) => computeBadges(s).map((b) => b.id);

describe("computeBadges", () => {
  test("sin actividad no hay insignias", () => {
    expect(computeBadges(base)).toEqual([]);
  });

  test("primer lote: comercio con un lote publicado o reciclador con un retiro", () => {
    expect(ids({ ...base, lotsPublished: 1 })).toEqual(["primer-lote"]);
    expect(ids({ ...base, role: "valorizador", completedCount: 1 })).toEqual(["primer-lote"]);
  });

  test("insignias por kg desviados", () => {
    expect(ids({ ...base, completedKg: 1000 })).toEqual(["100-kg", "1-tonelada"]);
  });

  test("5 estrellas exige promedio ≥ 4.8 con al menos 3 calificaciones", () => {
    expect(ids({ ...base, ratingAvg: 4.8, ratingCount: 3 })).toEqual(["5-estrellas"]);
    expect(ids({ ...base, ratingAvg: 5, ratingCount: 2 })).toEqual([]);
  });

  test("verificado solo aplica a recicladores", () => {
    expect(ids({ ...base, role: "valorizador", verified: true })).toEqual(["verificado"]);
    expect(ids({ ...base, verified: true })).toEqual([]);
  });

  test("cada insignia trae etiqueta y descripción", () => {
    const [badge] = computeBadges({ ...base, completedKg: 100 });
    expect(badge).toMatchObject({ id: "100-kg", label: "100 kg" });
    expect(badge.description.length).toBeGreaterThan(0);
  });
});
