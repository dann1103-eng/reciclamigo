import jsQR from "jsqr";
import { PNG } from "pngjs";
import { describe, expect, test } from "vitest";

import { circularQrDataUrl, circularQrPng } from "./qr";
import { circularQrDownloadPath, circularQrFilename, circularUrl, isCircularSlug } from "./url";

function decode(png: Buffer): string | undefined {
  const image = PNG.sync.read(png);
  return jsQR(new Uint8ClampedArray(image.data), image.width, image.height)?.data;
}

describe("circularUrl", () => {
  test("arma la dirección pública de la insignia sin doble barra", () => {
    expect(circularUrl("cafe-la-esquina", "https://reciclamigo.vercel.app/")).toBe(
      "https://reciclamigo.vercel.app/circular/cafe-la-esquina",
    );
    expect(circularUrl("cafe-la-esquina", "http://localhost:3000")).toBe("http://localhost:3000/circular/cafe-la-esquina");
  });
});

describe("isCircularSlug", () => {
  test("acepta lo que genera la base: minúsculas, números y guiones simples", () => {
    expect(isCircularSlug("cafe-la-esquina")).toBe(true);
    expect(isCircularSlug("comercio-2")).toBe(true);
    expect(isCircularSlug("hotel")).toBe(true);
  });

  test("rechaza mayúsculas, espacios, guiones sobrantes y rutas", () => {
    expect(isCircularSlug("")).toBe(false);
    expect(isCircularSlug("Cafe")).toBe(false);
    expect(isCircularSlug("cafe la esquina")).toBe(false);
    expect(isCircularSlug("-cafe")).toBe(false);
    expect(isCircularSlug("cafe-")).toBe(false);
    expect(isCircularSlug("cafe--esquina")).toBe(false);
    expect(isCircularSlug("../admin")).toBe(false);
    expect(isCircularSlug("a".repeat(201))).toBe(false);
  });
});

describe("descarga del QR", () => {
  test("ruta y nombre de archivo", () => {
    expect(circularQrDownloadPath("cafe-la-esquina")).toBe("/circular/cafe-la-esquina/qr?descargar=1");
    expect(circularQrFilename("cafe-la-esquina")).toBe("comercio-circular-cafe-la-esquina.png");
  });
});

describe("QR de la insignia", () => {
  test("la vista previa (data URL) se lee y lleva a la página pública", async () => {
    const dataUrl = await circularQrDataUrl("cafe-la-esquina", "https://reciclamigo.vercel.app");
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(decode(Buffer.from(dataUrl.split(",")[1], "base64"))).toBe("https://reciclamigo.vercel.app/circular/cafe-la-esquina");
  });

  test("el PNG de descarga es grande, se lee y lleva a la misma página", async () => {
    const png = await circularQrPng("cafe-la-esquina", "https://reciclamigo.vercel.app");
    expect(PNG.sync.read(png).width).toBeGreaterThanOrEqual(800);
    expect(decode(png)).toBe("https://reciclamigo.vercel.app/circular/cafe-la-esquina");
  });
});
