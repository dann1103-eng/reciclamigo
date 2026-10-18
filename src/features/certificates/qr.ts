import QRCode from "qrcode";

import { certificateUrl } from "./url";

/** QR (PNG en data URL) que abre la página de verificación del certificado. */
export function certificateQrDataUrl(code: string, siteUrl?: string): Promise<string> {
  return QRCode.toDataURL(certificateUrl(code, siteUrl), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: { dark: "#1c2b22", light: "#ffffff" },
  });
}
