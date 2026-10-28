import { describe, expect, test } from "vitest";

import { redeemLink, redeemMessage } from "./redeem";

describe("redeemMessage", () => {
  test("dice quién es y cuántos puntos tiene", () => {
    expect(redeemMessage({ name: "Café La Esquina", balance: 1240 })).toMatch(/Café La Esquina/);
    expect(redeemMessage({ name: "Café La Esquina", balance: 1240 })).toMatch(/1.?240 puntos/);
  });

  test("un solo punto va en singular", () => {
    expect(redeemMessage({ name: "Rosa", balance: 1 })).toMatch(/1 punto\b/);
  });
});

describe("redeemLink", () => {
  test("abre WhatsApp con el número en formato internacional y el mensaje prellenado", () => {
    const link = redeemLink("7777-1234", "Hola, quiero canjear");
    expect(link).toBe("https://wa.me/50377771234?text=Hola%2C%20quiero%20canjear");
  });

  test("respeta un número que ya viene con 503", () => {
    expect(redeemLink("50377771234", "Hola")).toBe("https://wa.me/50377771234?text=Hola");
  });
});
