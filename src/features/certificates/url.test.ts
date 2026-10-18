import { PNG } from "pngjs";
import jsQR from "jsqr";
import { describe, expect, test } from "vitest";

import { certificateQrDataUrl } from "./qr";
import { certificateUrl, isCertificateCode, normalizeCertificateCode } from "./url";

describe("certificateUrl", () => {
  test("arma la URL pública de verificación sin doble barra", () => {
    expect(certificateUrl("RCA-2026-0A1B2C", "https://reciclamigo.vercel.app/")).toBe(
      "https://reciclamigo.vercel.app/certificados/RCA-2026-0A1B2C",
    );
    expect(certificateUrl("RCA-2026-0A1B2C", "http://localhost:3000")).toBe("http://localhost:3000/certificados/RCA-2026-0A1B2C");
  });
});

describe("isCertificateCode", () => {
  test("solo acepta el formato RCA-AAAA-XXXXXX en mayúsculas", () => {
    expect(isCertificateCode("RCA-2026-0A1B2C")).toBe(true);
    expect(isCertificateCode("rca-2026-0a1b2c")).toBe(false);
    expect(isCertificateCode("RCA-2026-0A1B2")).toBe(false);
    expect(isCertificateCode("RCA-2026-0A1B2C/../x")).toBe(false);
  });
});

describe("normalizeCertificateCode", () => {
  test("acepta el código escrito a mano en minúsculas o con espacios", () => {
    expect(normalizeCertificateCode("rca-2026-0a1b2c")).toBe("RCA-2026-0A1B2C");
    expect(normalizeCertificateCode(" RCA-2026-0A1B2C ")).toBe("RCA-2026-0A1B2C");
    expect(normalizeCertificateCode("rca-2026-zzzzzz")).toBeNull();
  });
});

describe("certificateQrDataUrl", () => {
  test("el QR se lee y lleva a la URL de verificación", async () => {
    const dataUrl = await certificateQrDataUrl("RCA-2026-0A1B2C", "https://reciclamigo.vercel.app");
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    const png = PNG.sync.read(Buffer.from(dataUrl.split(",")[1], "base64"));
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(decoded?.data).toBe("https://reciclamigo.vercel.app/certificados/RCA-2026-0A1B2C");
  });
});
