import { describe, expect, test } from "vitest";

import { collectorOptionLabel, countDeliveriesByCollector, orderCollectors } from "./collectors";

const profiles = [
  { id: "c-ana", name: "Ana Reciclajes" },
  { id: "c-jose", name: "Don José" },
  { id: "c-maria", name: "Doña María" },
  { id: "c-zeta", name: "Zeta Acopio" },
];

describe("countDeliveriesByCollector", () => {
  test("cuenta las entregas completadas de cada reciclador", () => {
    const counts = countDeliveriesByCollector([{ collector_id: "c-jose" }, { collector_id: "c-maria" }, { collector_id: "c-jose" }]);
    expect(counts.get("c-jose")).toBe(2);
    expect(counts.get("c-maria")).toBe(1);
    expect(counts.get("c-ana")).toBeUndefined();
  });
});

describe("orderCollectors", () => {
  test("primero los que ya completaron entregas con el comercio (los que más, antes), luego el resto por nombre", () => {
    const counts = new Map([
      ["c-maria", 5],
      ["c-zeta", 1],
    ]);
    const { known, others } = orderCollectors(profiles, counts);
    expect(known.map((c) => c.id)).toEqual(["c-maria", "c-zeta"]);
    expect(known.map((c) => c.deliveries)).toEqual([5, 1]);
    expect(others.map((c) => c.id)).toEqual(["c-ana", "c-jose"]);
    expect(others.every((c) => c.deliveries === 0)).toBe(true);
  });

  test("con las mismas entregas, ordena por nombre", () => {
    const counts = new Map([
      ["c-zeta", 2],
      ["c-ana", 2],
    ]);
    expect(orderCollectors(profiles, counts).known.map((c) => c.id)).toEqual(["c-ana", "c-zeta"]);
  });

  test("sin entregas todos van en 'otros'", () => {
    const { known, others } = orderCollectors(profiles, new Map());
    expect(known).toEqual([]);
    expect(others).toHaveLength(4);
  });

  test("ordena los nombres con acentos como en español", () => {
    const { others } = orderCollectors(
      [
        { id: "1", name: "Óscar" },
        { id: "2", name: "Zoila" },
        { id: "3", name: "Álvaro" },
        { id: "4", name: "Beto" },
      ],
      new Map(),
    );
    expect(others.map((c) => c.name)).toEqual(["Álvaro", "Beto", "Óscar", "Zoila"]);
  });

  test("un reciclador con entregas que ya no aparece entre los perfiles no se inventa", () => {
    const { known } = orderCollectors(profiles, new Map([["fantasma", 9]]));
    expect(known).toEqual([]);
  });
});

describe("collectorOptionLabel", () => {
  test("dice cuántas entregas lleva con el comercio", () => {
    expect(collectorOptionLabel({ id: "a", name: "Don José", deliveries: 3 })).toBe("Don José · 3 entregas contigo");
    expect(collectorOptionLabel({ id: "a", name: "Don José", deliveries: 1 })).toBe("Don José · 1 entrega contigo");
    expect(collectorOptionLabel({ id: "a", name: "Don José", deliveries: 0 })).toBe("Don José");
  });
});
