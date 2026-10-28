import { describe, expect, test } from "vitest";

import { groupSettings } from "./settings-groups";

const row = (key: string) => ({ key });

describe("groupSettings", () => {
  test("agrupa por secciones, en el orden de la pantalla", () => {
    const groups = groupSettings([
      row("reciclapuntos_por_lb"),
      row("contacto_whatsapp_reciclamigo"),
      row("lotes_gratis_por_mes"),
      row("comision_volumen_pct"),
      row("precio_ref_pet_usd_lb"),
      row("radios_aviso_km"),
      row("horas_liberar_reserva"),
    ]);
    expect(groups.map((g) => g.title)).toEqual([
      "Plan y límites",
      "Comisión",
      "Precios de referencia por libra",
      "Avisos",
      "Reservas",
      "ReciclaPuntos",
      "Contacto",
    ]);
  });

  test("dentro de cada sección respeta el orden definido, no el de la base", () => {
    const [precios] = groupSettings([row("precio_ref_ps_usd_lb"), row("precio_ref_pet_usd_lb"), row("precio_ref_pp_usd_lb")]);
    expect(precios.rows.map((r) => r.key)).toEqual(["precio_ref_pet_usd_lb", "precio_ref_pp_usd_lb", "precio_ref_ps_usd_lb"]);
  });

  test("omite las secciones vacías", () => {
    expect(groupSettings([row("comision_volumen_pct")]).map((g) => g.title)).toEqual(["Comisión"]);
  });

  test("un ajuste nuevo que no está en ninguna sección no desaparece: va a 'Otros ajustes'", () => {
    const groups = groupSettings([row("comision_volumen_pct"), row("ajuste_nuevo")]);
    expect(groups.at(-1)).toEqual({ title: "Otros ajustes", rows: [{ key: "ajuste_nuevo" }] });
  });
});
