import { describe, expect, test } from "vitest";
import { computeBadges, type ProfileStats } from "./badges";

const base: ProfileStats = {
  role: "generador",
  completedCount: 0,
  completedLb: 0,
  ratingAvg: null,
  ratingCount: 0,
  verified: false,
};
const ids = (s: ProfileStats) => computeBadges(s).map((b) => b.id);

describe("computeBadges", () => {
  test("sin actividad no hay insignias", () => {
    expect(computeBadges(base)).toEqual([]);
  });

  test("publicar lotes no da insignia: solo cuentan las entregas confirmadas", () => {
    expect(ids({ ...base, completedCount: 0 })).toEqual([]);
  });

  test("Comercio Circular: un comercio con al menos una entrega confirmada", () => {
    expect(ids({ ...base, completedCount: 1 })).toEqual(["comercio-circular"]);
    const [badge] = computeBadges({ ...base, completedCount: 1 });
    expect(badge.label).toBe("Comercio Circular");
  });

  test("primera entrega: el reciclador con una entrega confirmada", () => {
    expect(ids({ ...base, role: "valorizador", completedCount: 1 })).toEqual(["primera-entrega"]);
  });

  test("insignias por libras entregadas: 1 quintal (100 lb) y 1 tonelada (2,204.62 lb)", () => {
    expect(ids({ ...base, completedCount: 1, completedLb: 99.9 })).toEqual(["comercio-circular"]);
    expect(ids({ ...base, completedCount: 1, completedLb: 100 })).toEqual(["comercio-circular", "1-quintal"]);
    expect(ids({ ...base, completedCount: 2, completedLb: 2204.62 })).toEqual(["comercio-circular", "1-quintal", "1-tonelada"]);
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
    const badge = computeBadges({ ...base, completedCount: 1, completedLb: 100 }).find((b) => b.id === "1-quintal");
    expect(badge).toMatchObject({ id: "1-quintal", label: "1 quintal" });
    expect(badge?.description.length).toBeGreaterThan(0);
  });
});
