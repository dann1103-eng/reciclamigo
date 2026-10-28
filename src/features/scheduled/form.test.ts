import { describe, expect, test } from "vitest";

import { emptyScheduledForm, scheduledToForm, validateScheduledForm, type ScheduledFormValues } from "./form";
import type { ScheduledPickup } from "./format";

const COLLECTOR = "6f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f";

const valid: ScheduledFormValues = {
  collectorId: COLLECTOR,
  polymerCode: "PET",
  estimatedLb: "120",
  modality: "venta",
  weekday: "1",
  startTime: "09:00",
  endTime: "11:00",
  notes: "",
};

describe("validateScheduledForm", () => {
  test("un formulario completo da la entrada que espera la acción", () => {
    expect(validateScheduledForm(valid)).toEqual({
      ok: true,
      input: {
        collectorId: COLLECTOR,
        polymerCode: "PET",
        estimatedLb: 120,
        modality: "venta",
        weekday: 1,
        startTime: "09:00",
        endTime: "11:00",
      },
    });
  });

  test("las libras aceptan coma decimal y miles como se escribe en El Salvador", () => {
    const lb = (raw: string) => {
      const r = validateScheduledForm({ ...valid, estimatedLb: raw });
      return r.ok ? r.input.estimatedLb : r.error;
    };
    expect(lb("95,5")).toBe(95.5);
    expect(lb("95.5")).toBe(95.5);
    expect(lb("1,250")).toBe(1250);
    expect(lb(" 80 ")).toBe(80);
  });

  test("el domingo (0) es un día válido", () => {
    const r = validateScheduledForm({ ...valid, weekday: "0" });
    expect(r.ok && r.input.weekday).toBe(0);
  });

  test("lleva el id cuando se edita y las notas sin espacios sobrantes", () => {
    const id = "0b9d1f2a-3c4d-4e5f-8a6b-7c8d9e0f1a2b";
    const r = validateScheduledForm({ ...valid, notes: "  Tocar el timbre  " }, id);
    expect(r.ok && r.input).toMatchObject({ id, notes: "Tocar el timbre" });
  });

  test("notas vacías no se mandan", () => {
    const r = validateScheduledForm({ ...valid, notes: "   " });
    expect(r.ok && "notes" in r.input && r.input.notes).toBeFalsy();
  });

  test.each([
    ["sin reciclador", { collectorId: "" }, "Elige el reciclador de confianza"],
    ["sin plástico", { polymerCode: "" }, "Elige el tipo de plástico"],
    ["plástico inexistente", { polymerCode: "XX" }, "Elige el tipo de plástico"],
    ["libras vacías", { estimatedLb: "" }, "Escribe las libras, por ejemplo 120 o 95,5"],
    ["libras no numéricas", { estimatedLb: "mucho" }, "Escribe las libras, por ejemplo 120 o 95,5"],
    ["libras en cero", { estimatedLb: "0" }, "El lote debe pesar al menos 0.1 lb"],
    ["libras de más", { estimatedLb: "22001" }, "Máximo 22,000 lb por lote"],
    ["sin modalidad", { modality: "" }, "Elige venta, trueque o donación"],
    ["sin día", { weekday: "" }, "Elige el día de la semana"],
    ["día fuera de rango", { weekday: "7" }, "Elige el día de la semana"],
    ["sin hora inicial", { startTime: "" }, "Elige la hora inicial"],
    ["sin hora final", { endTime: "" }, "Elige la hora final"],
    ["hora final igual a la inicial", { endTime: "09:00" }, "La hora final debe ser después de la inicial"],
    ["hora final antes de la inicial", { startTime: "14:00", endTime: "09:00" }, "La hora final debe ser después de la inicial"],
    ["notas demasiado largas", { notes: "x".repeat(281) }, "Las notas pueden tener hasta 280 caracteres"],
  ])("%s", (_name, patch, message) => {
    expect(validateScheduledForm({ ...valid, ...patch })).toEqual({ ok: false, error: message });
  });
});

describe("formularios de ejemplo", () => {
  const pickup: ScheduledPickup = {
    id: "sp-1",
    collectorId: COLLECTOR,
    collectorName: "Don José",
    polymerCode: "HDPE",
    estimatedLb: 95.5,
    modality: "trueque",
    weekday: 0,
    startTime: "14:30:00",
    endTime: "16:00:00",
    notes: "Bodega del fondo",
    active: false,
  };

  test("scheduledToForm rellena el formulario de edición (horas en HH:MM)", () => {
    expect(scheduledToForm(pickup)).toEqual({
      collectorId: COLLECTOR,
      polymerCode: "HDPE",
      estimatedLb: "95.5",
      modality: "trueque",
      weekday: "0",
      startTime: "14:30",
      endTime: "16:00",
      notes: "Bodega del fondo",
    });
  });

  test("un formulario de edición sin cambios es válido", () => {
    expect(validateScheduledForm(scheduledToForm(pickup), "0b9d1f2a-3c4d-4e5f-8a6b-7c8d9e0f1a2b").ok).toBe(true);
  });

  test("el formulario nuevo parte vacío salvo la modalidad y el horario sugerido", () => {
    expect(emptyScheduledForm()).toEqual({
      collectorId: "",
      polymerCode: "",
      estimatedLb: "",
      modality: "venta",
      weekday: "",
      startTime: "09:00",
      endTime: "11:00",
      notes: "",
    });
    expect(emptyScheduledForm(COLLECTOR).collectorId).toBe(COLLECTOR);
  });
});
