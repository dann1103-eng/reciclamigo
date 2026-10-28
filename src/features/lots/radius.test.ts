import { describe, expect, test } from "vitest";

import { defaultRadius, radiiToMeters, zoomForRadius } from "./radius";

describe("radiiToMeters", () => {
  test("convierte los km de la configuración a metros, ordenados y sin repetir", () => {
    expect(radiiToMeters([1, 3, 5])).toEqual([1000, 3000, 5000]);
    expect(radiiToMeters([5, 1, 3, 3])).toEqual([1000, 3000, 5000]);
    expect(radiiToMeters([0.5, 2])).toEqual([500, 2000]);
  });

  test("descarta radios que no sirven", () => {
    expect(radiiToMeters([0, -2, 4])).toEqual([4000]);
  });
});

describe("defaultRadius", () => {
  test("empieza en el radio del medio de los que haya configurados", () => {
    expect(defaultRadius([1000, 3000, 5000])).toBe(3000);
    expect(defaultRadius([2000, 4000, 6000, 8000])).toBe(4000);
    expect(defaultRadius([2000])).toBe(2000);
    expect(defaultRadius([1000, 2000])).toBe(1000);
  });
});

describe("zoomForRadius", () => {
  test("un radio mayor se ve con menos zoom, con los mismos niveles de siempre para 1, 3 y 5 km", () => {
    expect(zoomForRadius(1000)).toBe(15);
    expect(zoomForRadius(3000)).toBe(13);
    expect(zoomForRadius(5000)).toBe(12);
  });

  test("se mantiene en un rango razonable para cualquier radio configurado", () => {
    expect(zoomForRadius(100)).toBeLessThanOrEqual(16);
    expect(zoomForRadius(50_000)).toBeGreaterThanOrEqual(8);
  });
});
