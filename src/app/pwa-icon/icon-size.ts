export const ICON_SIZES = [192, 512] as const;
export type IconSize = (typeof ICON_SIZES)[number];

/** El segmento de la ruta (/pwa-icon/192) como tamaño válido, o null si no existe ese ícono. */
export function iconSizeFromParam(raw: string): IconSize | null {
  return ICON_SIZES.find((size) => String(size) === raw) ?? null;
}

/** `?maskable=1` pide la variante con margen de seguridad para íconos recortados por el sistema. */
export function isMaskableParam(raw: string | null): boolean {
  return raw === "1";
}
