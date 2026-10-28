import { describe, expect, test } from "vitest";

import { currentMonth, monthFirstDay, monthLabel, monthOf, monthRange, parseMonth, recentMonths, shiftMonth } from "./month";

describe("currentMonth", () => {
  test("el mes cambia a las 00:00 de El Salvador (06:00 UTC), no a las 00:00 UTC", () => {
    expect(currentMonth(new Date("2026-11-01T03:00:00Z"))).toBe("2026-10");
    expect(currentMonth(new Date("2026-11-01T06:00:00Z"))).toBe("2026-11");
  });
});

describe("monthOf", () => {
  test("una comisión de las 23:30 del 31 de octubre en El Salvador es de octubre, aunque en UTC ya sea noviembre", () => {
    expect(monthOf("2026-11-01T05:30:00Z")).toBe("2026-10");
    expect(monthOf("2026-11-01T06:00:00Z")).toBe("2026-11");
  });
});

describe("parseMonth", () => {
  const now = new Date("2026-10-28T15:00:00Z");

  test("acepta un mes válido", () => {
    expect(parseMonth("2026-03", now)).toBe("2026-03");
  });

  test("si falta o es inválido usa el mes actual", () => {
    expect(parseMonth(undefined, now)).toBe("2026-10");
    expect(parseMonth("", now)).toBe("2026-10");
    expect(parseMonth("2026-13", now)).toBe("2026-10");
    expect(parseMonth("octubre", now)).toBe("2026-10");
    expect(parseMonth("2026-1", now)).toBe("2026-10");
  });
});

describe("monthRange", () => {
  test("va de las 00:00 de El Salvador del día 1 a las 00:00 del mes siguiente (en UTC)", () => {
    expect(monthRange("2026-10")).toEqual({
      from: "2026-10-01T06:00:00.000Z",
      to: "2026-11-01T06:00:00.000Z",
    });
  });

  test("diciembre termina el 1 de enero del año siguiente", () => {
    expect(monthRange("2026-12")).toEqual({
      from: "2026-12-01T06:00:00.000Z",
      to: "2027-01-01T06:00:00.000Z",
    });
  });

  test("febrero de un año bisiesto tiene 29 días", () => {
    const { from, to } = monthRange("2028-02");
    expect((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000).toBe(29);
  });
});

describe("monthFirstDay", () => {
  test("es el argumento de commission_summary(p_month)", () => {
    expect(monthFirstDay("2026-10")).toBe("2026-10-01");
  });
});

describe("shiftMonth", () => {
  test("avanza y retrocede, cruzando de año", () => {
    expect(shiftMonth("2026-10", 1)).toBe("2026-11");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-10", -14)).toBe("2025-08");
  });
});

describe("monthLabel", () => {
  test("lo escribe en español", () => {
    expect(monthLabel("2026-10")).toBe("octubre de 2026");
    expect(monthLabel("2027-01")).toBe("enero de 2027");
  });
});

describe("recentMonths", () => {
  test("del mes actual hacia atrás", () => {
    expect(recentMonths(new Date("2026-02-10T12:00:00Z"), 4)).toEqual(["2026-02", "2026-01", "2025-12", "2025-11"]);
  });
});
