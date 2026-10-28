import QRCode from "qrcode";

import { circularUrl } from "./url";

const COLORS = { dark: "#1c2b22", light: "#ffffff" };

/** QR (PNG en data URL) para mostrar en pantalla: abre la página pública de la insignia. */
export function circularQrDataUrl(slug: string, siteUrl?: string): Promise<string> {
  return QRCode.toDataURL(circularUrl(slug, siteUrl), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: COLORS,
  });
}

/** QR en PNG grande y con margen de silencio, para descargar e imprimir (vitrina, factura, redes). */
export function circularQrPng(slug: string, siteUrl?: string): Promise<Buffer> {
  return QRCode.toBuffer(circularUrl(slug, siteUrl), {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 4,
    width: 1024,
    color: COLORS,
  });
}
