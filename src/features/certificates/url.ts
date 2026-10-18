const CODE_PATTERN = /^RCA-\d{4}-[0-9A-F]{6}$/;

/** Formato que genera la base al completar un retiro: RCA-AAAA-XXXXXX. */
export function isCertificateCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}

/** URL pública de verificación (la que va en el QR). */
export function certificateUrl(code: string, siteUrl: string = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"): string {
  return `${siteUrl.replace(/\/+$/, "")}/certificados/${code}`;
}
