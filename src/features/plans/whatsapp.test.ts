import { describe, expect, test } from "vitest";

import { planActivationMessage, planActivationUrl } from "./whatsapp";

describe("planActivationMessage", () => {
  test("lleva el nombre del negocio", () => {
    expect(planActivationMessage("Comedor La Ceiba")).toBe("Hola, quiero activar el Plan Trazabilidad para Comedor La Ceiba");
  });
});

describe("planActivationUrl", () => {
  test("abre wa.me con el número de Reciclamigo y el mensaje prellenado", () => {
    expect(planActivationUrl("50370000000", "Comedor La Ceiba")).toBe(
      `https://wa.me/50370000000?text=${encodeURIComponent("Hola, quiero activar el Plan Trazabilidad para Comedor La Ceiba")}`,
    );
  });

  test("normaliza un número de 8 dígitos al formato +503", () => {
    expect(planActivationUrl("7000 0000", "Hotel Sol")).toContain("https://wa.me/50370000000?text=");
  });

  test("sin número no hay enlace", () => {
    expect(planActivationUrl(null, "Hotel Sol")).toBeNull();
  });
});
