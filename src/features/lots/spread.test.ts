import { describe, expect, test } from "vitest";

import { spreadOverlapping } from "./spread";

const lot = (id: string, lat: number, lng: number) => ({ id, lat, lng });

describe("spreadOverlapping", () => {
  test("los lotes que no se tocan quedan sin desplazamiento", () => {
    const out = spreadOverlapping([lot("a", 14, -89.5), lot("b", 14.01, -89.5)]);
    expect(out.map((l) => l.offsetPx)).toEqual([0, 0]);
  });

  test("los del mismo punto se reparten de lado a lado en píxeles, sin mover su coordenada", () => {
    const out = spreadOverlapping([lot("a", 14, -89.5), lot("b", 14, -89.5), lot("c", 14, -89.5)]);
    expect(out.map((l) => l.offsetPx)).toEqual([-24, 0, 24]);
    expect(out.every((l) => l.lat === 14 && l.lng === -89.5)).toBe(true);
    expect(out.map((l) => l.id)).toEqual(["a", "b", "c"]);
  });

  test("dos en el mismo punto quedan a ambos lados", () => {
    const out = spreadOverlapping([lot("a", 14, -89.5), lot("x", 13, -89), lot("b", 14, -89.5)]);
    expect(out.map((l) => l.offsetPx)).toEqual([-12, 0, 12]);
  });
});
