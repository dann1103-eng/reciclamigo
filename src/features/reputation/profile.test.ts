import { describe, expect, test } from "vitest";

import { isUuid, profileSubtitle, ratingsLabel, starsLabel, valorizadorKindLabel, viewableRole } from "./profile";

describe("isUuid", () => {
  test("acepta un uuid y rechaza lo demás (evita consultar la base con basura)", () => {
    expect(isUuid("3f2c9a4e-1b7d-4c1e-9a55-0d6f5b8e2a10")).toBe(true);
    expect(isUuid("3F2C9A4E-1B7D-4C1E-9A55-0D6F5B8E2A10")).toBe(true);
    expect(isUuid("123")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid("3f2c9a4e-1b7d-4c1e-9a55-0d6f5b8e2a1g")).toBe(false);
    expect(isUuid("3f2c9a4e-1b7d-4c1e-9a55-0d6f5b8e2a10/../x")).toBe(false);
  });
});

describe("viewableRole", () => {
  test("solo se ven los perfiles de comercios y recicladores", () => {
    expect(viewableRole("generador")).toBe(true);
    expect(viewableRole("valorizador")).toBe(true);
    expect(viewableRole("municipalidad")).toBe(false);
    expect(viewableRole("administrador")).toBe(false);
  });
});

describe("valorizadorKindLabel", () => {
  test("distingue reciclador de base y comprador de volumen", () => {
    expect(valorizadorKindLabel("base")).toBe("Reciclador de base");
    expect(valorizadorKindLabel("volumen")).toBe("Comprador de volumen");
  });

  test("sin clasificar no muestra nada", () => {
    expect(valorizadorKindLabel(null)).toBeNull();
  });
});

describe("profileSubtitle", () => {
  test("tipo de organización, municipio y zona", () => {
    expect(profileSubtitle({ orgType: "Restaurante", municipality: "Santa Ana", zone: "Centro" })).toBe(
      "Restaurante · Santa Ana · Centro",
    );
  });

  test("omite lo que venga vacío", () => {
    expect(profileSubtitle({ orgType: "Hotel", municipality: "San Salvador", zone: "  " })).toBe("Hotel · San Salvador");
  });
});

describe("starsLabel", () => {
  test("texto para lectores de pantalla", () => {
    expect(starsLabel(5)).toBe("5 de 5 estrellas");
    expect(starsLabel(1)).toBe("1 de 5 estrellas");
  });
});

describe("ratingsLabel", () => {
  test("resume el promedio y cuántas calificaciones hay", () => {
    expect(ratingsLabel(4.5, 6)).toBe("4.5 ★ de 6 calificaciones");
    expect(ratingsLabel(5, 1)).toBe("5 ★ de 1 calificación");
  });

  test("sin calificaciones lo dice", () => {
    expect(ratingsLabel(null, 0)).toBe("Sin calificaciones todavía");
  });
});
