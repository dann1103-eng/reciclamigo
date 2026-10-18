export type LatLng = { lat: number; lng: number };

/**
 * Lee un punto de PostGIS tal como llega por PostgREST: EWKB en hexadecimal (lo normal),
 * GeoJSON o WKT. Devuelve null si no es un punto. Funciona en el navegador (sin Buffer).
 */
export function parsePoint(value: unknown): LatLng | null {
  if (value && typeof value === "object") {
    const geo = value as { type?: string; coordinates?: unknown };
    if (geo.type === "Point" && Array.isArray(geo.coordinates) && geo.coordinates.length >= 2) {
      const [lng, lat] = geo.coordinates as [number, number];
      return { lat, lng };
    }
    return null;
  }
  if (typeof value !== "string") return null;

  const wkt = value.match(/POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i);
  if (wkt) return { lat: Number(wkt[2]), lng: Number(wkt[1]) };

  if (!/^[0-9a-f]+$/i.test(value) || value.length < 42) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16);
  const view = new DataView(bytes.buffer);
  const little = bytes[0] === 1;
  const type = view.getUint32(1, little);
  if ((type & 0xff) !== 1) return null; // 1 = Point
  const offset = 5 + (type & 0x20000000 ? 4 : 0); // salta el SRID si viene
  return { lng: view.getFloat64(offset, little), lat: view.getFloat64(offset + 8, little) };
}
