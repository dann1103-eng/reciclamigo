import { describe, expect, test } from "vitest";

import { addDaysToDate, endOfSvDayIso, formatSvDate, svToday } from "./dates";

describe("svToday", () => {
  test("usa la fecha de El Salvador (UTC-6), no la de UTC", () => {
    // 01:00 UTC del 1 de noviembre todavía es 31 de octubre a las 19:00 en El Salvador.
    expect(svToday(new Date("2026-11-01T01:00:00Z"))).toBe("2026-10-31");
    expect(svToday(new Date("2026-11-01T06:00:00Z"))).toBe("2026-11-01");
  });
});

describe("addDaysToDate", () => {
  test("suma días y cruza de mes y de año", () => {
    expect(addDaysToDate("2026-10-28", 30)).toBe("2026-11-27");
    expect(addDaysToDate("2026-12-20", 15)).toBe("2027-01-04");
  });

  test("con 0 días devuelve la misma fecha", () => {
    expect(addDaysToDate("2026-10-28", 0)).toBe("2026-10-28");
  });
});

describe("endOfSvDayIso", () => {
  test("el vencimiento es el final de ese día en hora de El Salvador", () => {
    expect(endOfSvDayIso("2026-11-27")).toBe("2026-11-28T05:59:59.000Z");
  });

  test("rechaza fechas que no existen o mal escritas", () => {
    expect(endOfSvDayIso("2026-02-31")).toBeNull();
    expect(endOfSvDayIso("27/11/2026")).toBeNull();
    expect(endOfSvDayIso("")).toBeNull();
  });
});

describe("formatSvDate", () => {
  test("muestra la fecha en hora de El Salvador", () => {
    expect(formatSvDate("2026-11-28T05:59:59.000Z")).toBe("27 nov 2026");
  });
});
