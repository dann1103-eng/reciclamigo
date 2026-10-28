import QRCode from "qrcode";

import { voucherUrl } from "./url";

/** QR (PNG en data URL) que abre la página de verificación del comprobante. */
export function voucherQrDataUrl(code: string, siteUrl?: string): Promise<string> {
  return QRCode.toDataURL(voucherUrl(code, siteUrl), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: { dark: "#1c2b22", light: "#ffffff" },
  });
}
