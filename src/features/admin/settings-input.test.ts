import { describe, expect, test } from "vitest";

import { inputToSettingValue, settingKind, settingToInput, splitProvisional } from "./settings-input";

describe("settingKind", () => {
  test("sigue las mismas reglas que set_setting en la base", () => {
    expect(settingKind("plan_trazabilidad_precio_usd")).toBe("number");
    expect(settingKind("reciclapuntos_tope_mensual")).toBe("number");
    expect(settingKind("radios_aviso_km")).toBe("numberList");
    expect(settingKind("precio_ref_pet_usd_lb")).toBe("optionalNumber");
    expect(settingKind("precio_ref_ldpe_usd_lb")).toBe("optionalNumber");
    expect(settingKind("contacto_whatsapp_reciclamigo")).toBe("optionalText");
  });
});

describe("settingToInput (JSON -> texto del campo)", () => {
  test("número", () => {
    expect(settingToInput(14.99)).toBe("14.99");
    expect(settingToInput(8)).toBe("8");
  });

  test("lista de radios separada por comas", () => {
    expect(settingToInput([1, 3, 5])).toBe("1, 3, 5");
  });

  test("null queda como campo vacío", () => {
    expect(settingToInput(null)).toBe("");
  });

  test("texto tal cual", () => {
    expect(settingToInput("50370000000")).toBe("50370000000");
  });
});

describe("inputToSettingValue: números", () => {
  test("entero y decimal con punto", () => {
    expect(inputToSettingValue("lotes_gratis_por_mes", "8")).toEqual({ ok: true, value: 8 });
    expect(inputToSettingValue("plan_trazabilidad_precio_usd", " 14.99 ")).toEqual({ ok: true, value: 14.99 });
  });

  test("acepta la coma como decimal cuando no hay duda", () => {
    expect(inputToSettingValue("plan_trazabilidad_precio_usd", "14,99")).toEqual({ ok: true, value: 14.99 });
    expect(inputToSettingValue("comision_volumen_pct", "3,5")).toEqual({ ok: true, value: 3.5 });
  });

  test("quita el signo $ y los espacios", () => {
    expect(inputToSettingValue("plan_trazabilidad_precio_usd", "$ 14.99")).toEqual({ ok: true, value: 14.99 });
  });

  test("vacío no es válido en un número obligatorio", () => {
    expect(inputToSettingValue("lotes_gratis_por_mes", "  ")).toEqual({ ok: false, error: "Escribe un valor" });
  });

  test("texto y notación científica no son números", () => {
    expect(inputToSettingValue("lotes_gratis_por_mes", "ocho").ok).toBe(false);
    expect(inputToSettingValue("lotes_gratis_por_mes", "1e3").ok).toBe(false);
    expect(inputToSettingValue("lotes_gratis_por_mes", "Infinity").ok).toBe(false);
  });

  test("no adivina separadores de miles: 3,650 podría leerse como 3.65", () => {
    const miles = inputToSettingValue("historial_gratis_dias", "3,650");
    expect(miles.ok).toBe(false);
    expect(inputToSettingValue("historial_gratis_dias", "1.234,5").ok).toBe(false);
  });

  test("no valida el rango: de eso se encarga la base", () => {
    expect(inputToSettingValue("comision_volumen_pct", "9")).toEqual({ ok: true, value: 9 });
  });
});

describe("inputToSettingValue: lista de radios", () => {
  test("separada por comas, ordenada y sin repetidos", () => {
    expect(inputToSettingValue("radios_aviso_km", "1, 3, 5")).toEqual({ ok: true, value: [1, 3, 5] });
    expect(inputToSettingValue("radios_aviso_km", "5,1,3,3")).toEqual({ ok: true, value: [1, 3, 5] });
  });

  test("también con espacios o punto y coma, y con decimales con punto", () => {
    expect(inputToSettingValue("radios_aviso_km", "1 3 5")).toEqual({ ok: true, value: [1, 3, 5] });
    expect(inputToSettingValue("radios_aviso_km", "0.5; 2")).toEqual({ ok: true, value: [0.5, 2] });
  });

  test("ignora comas de más", () => {
    expect(inputToSettingValue("radios_aviso_km", "1,,3,")).toEqual({ ok: true, value: [1, 3] });
  });

  test("vacío o con algo que no es número, error", () => {
    expect(inputToSettingValue("radios_aviso_km", "")).toEqual({
      ok: false,
      error: "Escribe al menos un radio en km, por ejemplo 1, 3, 5",
    });
    const bad = inputToSettingValue("radios_aviso_km", "1, tres, 5");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toContain("tres");
  });
});

describe("inputToSettingValue: precio que puede quedar vacío", () => {
  test("vacío es null (sin precio de referencia)", () => {
    expect(inputToSettingValue("precio_ref_ldpe_usd_lb", "")).toEqual({ ok: true, value: null });
    expect(inputToSettingValue("precio_ref_pp_usd_lb", "   ")).toEqual({ ok: true, value: null });
  });

  test("con valor es número", () => {
    expect(inputToSettingValue("precio_ref_pet_usd_lb", "0.09")).toEqual({ ok: true, value: 0.09 });
    expect(inputToSettingValue("precio_ref_ps_usd_lb", "0,05")).toEqual({ ok: true, value: 0.05 });
  });

  test("texto que no es número, error", () => {
    expect(inputToSettingValue("precio_ref_pet_usd_lb", "caro").ok).toBe(false);
  });
});

describe("inputToSettingValue: WhatsApp de contacto", () => {
  test("vacío es null (sin enlace)", () => {
    expect(inputToSettingValue("contacto_whatsapp_reciclamigo", "")).toEqual({ ok: true, value: null });
  });

  test("normaliza al formato internacional de El Salvador", () => {
    expect(inputToSettingValue("contacto_whatsapp_reciclamigo", "7000 0000")).toEqual({ ok: true, value: "50370000000" });
    expect(inputToSettingValue("contacto_whatsapp_reciclamigo", "+503 7000-0000")).toEqual({ ok: true, value: "50370000000" });
  });

  test("un número incompleto o letras, error", () => {
    expect(inputToSettingValue("contacto_whatsapp_reciclamigo", "12345").ok).toBe(false);
    expect(inputToSettingValue("contacto_whatsapp_reciclamigo", "llámame").ok).toBe(false);
  });
});

describe("splitProvisional", () => {
  test("separa la marca PROVISIONAL de la descripción", () => {
    expect(splitProvisional("Tope de ReciclaPuntos que un usuario gana por mes (PROVISIONAL: definir con el equipo)")).toEqual({
      text: "Tope de ReciclaPuntos que un usuario gana por mes",
      provisional: true,
    });
  });

  test("una descripción normal queda igual", () => {
    expect(splitProvisional("Precio mensual del Plan Trazabilidad (USD)")).toEqual({
      text: "Precio mensual del Plan Trazabilidad (USD)",
      provisional: false,
    });
  });
});
