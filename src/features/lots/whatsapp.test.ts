import { describe, expect, test } from "vitest";

import { generatorMessage, lotCode, lotUrl, reservationMessage, whatsappLink } from "./whatsapp";

const lotId = "8f14e45f-ceea-4e7a-9c4e-1f0a4e7d2b11";
const siteUrl = "https://reciclamigo.vercel.app/";

describe("whatsappLink", () => {
  test("deja el número en formato internacional (+503) y codifica el texto", () => {
    expect(whatsappLink("+503 7012-3456", "Hola")).toBe("https://wa.me/50370123456?text=Hola");
    expect(whatsappLink("50370123456", "Voy por 40 lb")).toBe("https://wa.me/50370123456?text=Voy%20por%2040%20lb");
  });

  test("un número local de ocho dígitos recibe el prefijo 503", () => {
    expect(whatsappLink("7012-3456", "Hola")).toBe("https://wa.me/50370123456?text=Hola");
    expect(whatsappLink("70123456", "Hola")).toBe("https://wa.me/50370123456?text=Hola");
  });
});

describe("lotCode y lotUrl", () => {
  test("el código del lote son los primeros 6 caracteres del id, en mayúsculas", () => {
    expect(lotCode(lotId)).toBe("L-8F14E4");
  });

  test("el enlace al lote no lleva doble barra", () => {
    expect(lotUrl(lotId, siteUrl)).toBe(`https://reciclamigo.vercel.app/lote/${lotId}`);
  });
});

describe("mensajes prellenados", () => {
  test("al reservar: código del lote, plástico, libras estimadas y enlace al lote", () => {
    const text = reservationMessage({
      collectorName: "Don José",
      lotId,
      polymerCode: "PET",
      estimatedLb: 250,
      windowLabel: "Mañana 9:00–11:00",
      siteUrl,
    });
    expect(text).toBe(
      `Hola, soy Don José de Reciclamigo. Reservé tu lote L-8F14E4: 250 lb (2.5 qq) de PET (Mañana 9:00–11:00). Míralo aquí: https://reciclamigo.vercel.app/lote/${lotId}`,
    );
  });

  test("del comercio al reciclador", () => {
    expect(generatorMessage({ generatorName: "Comedor La Ceiba", lotId, polymerCode: "PET", estimatedLb: 88.2, siteUrl })).toBe(
      `Hola, le escribimos de Comedor La Ceiba por Reciclamigo, sobre el lote L-8F14E4 de 88.2 lb de PET. https://reciclamigo.vercel.app/lote/${lotId}`,
    );
  });
});
