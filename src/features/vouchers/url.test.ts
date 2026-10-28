import { PNG } from "pngjs";
import jsQR from "jsqr";
import { describe, expect, test } from "vitest";

import { voucherQrDataUrl } from "./qr";
import { isVoucherCode, normalizeVoucherCode, voucherUrl } from "./url";

describe("voucherUrl", () => {
  test("arma la URL pública de verificación sin doble barra", () => {
    expect(voucherUrl("RCA-2026-0A1B2C", "https://reciclamigo.vercel.app/")).toBe(
      "https://reciclamigo.vercel.app/comprobantes/RCA-2026-0A1B2C",
    );
    expect(voucherUrl("RCA-2026-0A1B2C", "http://localhost:3000")).toBe("http://localhost:3000/comprobantes/RCA-2026-0A1B2C");
  });
});

describe("isVoucherCode", () => {
  test("solo acepta el formato RCA-AAAA-XXXXXX en mayúsculas", () => {
    expect(isVoucherCode("RCA-2026-0A1B2C")).toBe(true);
    expect(isVoucherCode("rca-2026-0a1b2c")).toBe(false);
    expect(isVoucherCode("RCA-2026-0A1B2")).toBe(false);
    expect(isVoucherCode("RCA-2026-0A1B2C/../x")).toBe(false);
  });
});

describe("normalizeVoucherCode", () => {
  test("acepta el código escrito a mano en minúsculas o con espacios", () => {
    expect(normalizeVoucherCode("rca-2026-0a1b2c")).toBe("RCA-2026-0A1B2C");
    expect(normalizeVoucherCode(" RCA-2026-0A1B2C ")).toBe("RCA-2026-0A1B2C");
    expect(normalizeVoucherCode("rca-2026-zzzzzz")).toBeNull();
  });
});

describe("voucherQrDataUrl", () => {
  test("el QR se lee y lleva a la URL de verificación", async () => {
    const dataUrl = await voucherQrDataUrl("RCA-2026-0A1B2C", "https://reciclamigo.vercel.app");
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    const png = PNG.sync.read(Buffer.from(dataUrl.split(",")[1], "base64"));
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(decoded?.data).toBe("https://reciclamigo.vercel.app/comprobantes/RCA-2026-0A1B2C");
  });
});
