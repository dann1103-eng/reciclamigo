// Mismo formato que genera la base (slugify): minúsculas, números y guiones simples entre palabras.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 200;

export function isCircularSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(slug);
}

/** Dirección pública de la insignia (la que va en el QR). */
export function circularUrl(slug: string, siteUrl: string = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"): string {
  return `${siteUrl.replace(/\/+$/, "")}/circular/${slug}`;
}

/** Ruta del PNG del QR con descarga directa. */
export function circularQrDownloadPath(slug: string): string {
  return `/circular/${slug}/qr?descargar=1`;
}

export function circularQrFilename(slug: string): string {
  return `comercio-circular-${slug}.png`;
}
