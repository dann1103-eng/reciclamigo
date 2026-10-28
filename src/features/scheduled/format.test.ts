import { describe, expect, test } from "vitest";

import {
  describeScheduled,
  formatClock,
  nextPickupLabel,
  nextPickupWindow,
  toHHMM,
  toScheduledView,
  weekdayLabel,
  type ScheduledPickup,
} from "./format";

const base: ScheduledPickup = {
  id: "sp-1",
  collectorId: "c-1",
  collectorName: "Don José",
  polymerCode: "PET",
  estimatedLb: 120,
  modality: "venta",
  weekday: 1,
  startTime: "09:00",
  endTime: "11:00",
  notes: null,
  active: true,
};

describe("weekdayLabel", () => {
  test("0 es domingo y 6 es sábado", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(weekdayLabel)).toEqual(["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]);
  });
});

describe("horas", () => {
  test("formatClock quita el cero inicial y los segundos", () => {
    expect(formatClock("09:00")).toBe("9:00");
    expect(formatClock("09:00:00")).toBe("9:00");
    expect(formatClock("14:30:00")).toBe("14:30");
    expect(formatClock("00:15")).toBe("0:15");
  });

  test("toHHMM deja la hora como la espera la base (HH:MM)", () => {
    expect(toHHMM("09:00:00")).toBe("09:00");
    expect(toHHMM("14:30")).toBe("14:30");
  });
});

describe("describeScheduled", () => {
  test("dice día, horas, libras, plástico y reciclador", () => {
    expect(describeScheduled(base)).toBe("Cada lunes de 9:00 a 11:00 · 120 lb (1.2 qq) de PET · con Don José");
  });

  test("bajo 100 lb no hay quintales; las horas de la tarde van en formato de 24 h", () => {
    expect(describeScheduled({ ...base, weekday: 5, startTime: "14:00:00", endTime: "16:30:00", estimatedLb: 60, polymerCode: "HDPE" })).toBe(
      "Cada viernes de 14:00 a 16:30 · 60 lb de HDPE · con Don José",
    );
  });

  test("si no se conoce al reciclador lo dice en genérico", () => {
    expect(describeScheduled({ ...base, collectorName: null })).toContain("con tu reciclador de confianza");
  });

  test("nunca usa las palabras prohibidas", () => {
    expect(describeScheduled(base)).not.toMatch(/certificad/i);
  });
});

describe("nextPickupWindow", () => {
  // Miércoles 28 de octubre de 2026, 09:00 en El Salvador (15:00 UTC)
  const now = new Date("2026-10-28T15:00:00Z");

  test("si es hoy y la hora de inicio todavía no llega, es hoy", () => {
    const w = nextPickupWindow({ weekday: 3, startTime: "14:00", endTime: "16:00" }, now);
    expect(w?.from.toISOString()).toBe("2026-10-28T20:00:00.000Z");
    expect(w?.to.toISOString()).toBe("2026-10-28T22:00:00.000Z");
  });

  test("si es hoy pero la hora ya pasó, es la semana que viene", () => {
    const w = nextPickupWindow({ weekday: 3, startTime: "08:00", endTime: "10:00" }, now);
    expect(w?.from.toISOString()).toBe("2026-11-04T14:00:00.000Z");
  });

  test("otro día de esta semana", () => {
    const w = nextPickupWindow({ weekday: 4, startTime: "09:00", endTime: "11:00" }, now);
    expect(w?.from.toISOString()).toBe("2026-10-29T15:00:00.000Z");
  });

  test("usa el día de El Salvador, no el de UTC (domingo 5 pm en SV ya es lunes en UTC)", () => {
    const sunday = new Date("2026-11-01T23:30:00Z"); // domingo 1 nov 17:30 SV
    const w = nextPickupWindow({ weekday: 1, startTime: "09:00", endTime: "11:00" }, sunday);
    expect(w?.from.toISOString()).toBe("2026-11-02T15:00:00.000Z"); // lunes 2 nov 09:00 SV
  });

  test("acepta las horas con segundos que manda la base", () => {
    const w = nextPickupWindow({ weekday: 4, startTime: "09:00:00", endTime: "11:00:00" }, now);
    expect(w?.from.toISOString()).toBe("2026-10-29T15:00:00.000Z");
  });
});

describe("nextPickupLabel", () => {
  const now = new Date("2026-10-28T15:00:00Z");

  test("usa Hoy y Mañana como el resto de la app", () => {
    expect(nextPickupLabel({ weekday: 3, startTime: "14:00", endTime: "16:00" }, now)).toBe("Hoy 14:00–16:00");
    expect(nextPickupLabel({ weekday: 4, startTime: "09:00", endTime: "11:00" }, now)).toBe("Mañana 9:00–11:00");
  });
});

describe("toScheduledView", () => {
  const now = new Date("2026-10-28T15:00:00Z");

  test("trae la descripción y la próxima fecha de un retiro activo", () => {
    const view = toScheduledView({ ...base, weekday: 4 }, now);
    expect(view.description).toBe("Cada jueves de 9:00 a 11:00 · 120 lb (1.2 qq) de PET · con Don José");
    expect(view.nextLabel).toBe("Mañana 9:00–11:00");
    expect(view.id).toBe("sp-1");
  });

  test("en pausa no hay próxima fecha", () => {
    expect(toScheduledView({ ...base, active: false }, now).nextLabel).toBeNull();
  });
});
