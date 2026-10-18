import { describe, expect, test } from "vitest";

import { collectorMessage, generatorMessage, whatsappLink } from "./whatsapp";

describe("whatsappLink", () => {
  test("deja solo dígitos en el número y codifica el texto", () => {
    expect(whatsappLink("+503 7012-3456", "Hola")).toBe("https://wa.me/50370123456?text=Hola");
    expect(whatsappLink("50370123456", "Voy por 40 kg")).toBe("https://wa.me/50370123456?text=Voy%20por%2040%20kg");
  });
});

describe("mensajes prellenados", () => {
  test("del reciclador al comercio", () => {
    expect(collectorMessage({ collectorName: "Don José", kg: 40, polymerCode: "PET", windowLabel: "Mañana 9:00–11:00" })).toBe(
      "Hola, soy Don José de Reciclamigo. Voy por tu lote de 40 kg de PET (Mañana 9:00–11:00).",
    );
  });

  test("del comercio al reciclador", () => {
    expect(generatorMessage({ generatorName: "Comedor La Ceiba", kg: 40, polymerCode: "PET" })).toBe(
      "Hola, le escribimos de Comedor La Ceiba por Reciclamigo, sobre el lote de 40 kg de PET.",
    );
  });
});
