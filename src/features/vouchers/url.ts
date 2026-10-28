const CODE_PATTERN = /^RCA-\d{4}-[0-9A-F]{6}$/;

/** Formato que genera la base al confirmar una entrega: RCA-AAAA-XXXXXX. */
export function isVoucherCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}

/** Código escrito a mano (minúsculas, espacios) en su forma canónica; null si no es válido. */
export function normalizeVoucherCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  return isVoucherCode(code) ? code : null;
}

/** URL pública de verificación del comprobante (la que va en el QR). */
export function voucherUrl(code: string, siteUrl: string = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"): string {
  return `${siteUrl.replace(/\/+$/, "")}/comprobantes/${code}`;
}
