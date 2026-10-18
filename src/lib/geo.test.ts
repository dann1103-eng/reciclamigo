import { describe, expect, test } from "vitest";

import { parsePoint } from "./geo";

describe("parsePoint", () => {
  test("lee el EWKB en hexadecimal que devuelve PostgREST", () => {
    // Ubicación sembrada de Don José, tal como la entrega Supabase.
    const point = parsePoint("0101000020E610000008AC1C5A646356C0A54E401361032C40");
    expect(point?.lat).toBeCloseTo(14.0066, 6);
    expect(point?.lng).toBeCloseTo(-89.553, 6);
  });

  test("lee GeoJSON y WKT", () => {
    expect(parsePoint({ type: "Point", coordinates: [-89.5597, 13.9946] })).toEqual({ lat: 13.9946, lng: -89.5597 });
    expect(parsePoint("SRID=4326;POINT(-89.5597 13.9946)")).toEqual({ lat: 13.9946, lng: -89.5597 });
  });

  test("devuelve null si no es un punto", () => {
    expect(parsePoint(null)).toBeNull();
    expect(parsePoint("hola")).toBeNull();
    expect(parsePoint({ type: "LineString", coordinates: [] })).toBeNull();
  });
});
