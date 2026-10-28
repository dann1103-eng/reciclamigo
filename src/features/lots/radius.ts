// Los radios del mapa son los de `radios_aviso_km` (configuración): el administrador los cambia
// sin tocar código. Aquí solo se convierten a metros y se deriva lo que depende de ellos.

/** Radios en metros, ordenados y sin repetir, a partir de los km de la configuración. */
export function radiiToMeters(km: number[]): number[] {
  return [...new Set(km.filter((k) => k > 0).map((k) => Math.round(k * 1000)))].sort((a, b) => a - b);
}

/** Radio con el que abre el mapa: el del medio de los configurados. */
export function defaultRadius(radiiM: number[]): number {
  return radiiM[Math.floor((radiiM.length - 1) / 2)];
}

/** Zoom de Leaflet que deja ver el círculo del radio completo (15 para 1 km, 13 para 3 km, 12 para 5 km). */
export function zoomForRadius(radiusM: number): number {
  return Math.max(8, Math.min(16, Math.round(15 - Math.log2(radiusM / 1000) * 1.3)));
}
