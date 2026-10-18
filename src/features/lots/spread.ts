export const PIN_GAP_PX = 24;

/**
 * Los lotes de un mismo comercio comparten coordenadas y sus pines se taparían.
 * A los que coinciden les asigna un desplazamiento horizontal en píxeles (constante a
 * cualquier zoom); la coordenada no cambia. Los demás quedan con 0.
 */
export function spreadOverlapping<T extends { lat: number; lng: number }>(lots: T[]): (T & { offsetPx: number })[] {
  const groups = new Map<string, number[]>();
  lots.forEach((l, i) => {
    const key = `${l.lat.toFixed(5)},${l.lng.toFixed(5)}`;
    groups.set(key, [...(groups.get(key) ?? []), i]);
  });
  const offsets = new Array<number>(lots.length).fill(0);
  for (const indexes of groups.values()) {
    indexes.forEach((index, k) => {
      offsets[index] = (k - (indexes.length - 1) / 2) * PIN_GAP_PX;
    });
  }
  return lots.map((l, i) => ({ ...l, offsetPx: offsets[i] }));
}
