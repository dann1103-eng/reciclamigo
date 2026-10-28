import { describe, expect, test } from "vitest";

import { currentMonthKey, isMonthKey, lastMonths, monthLabel, REPORT_MONTHS, reportFilename } from "./months";

describe("isMonthKey", () => {
  test("acepta AAAA-MM", () => {
    expect(isMonthKey("2026-10")).toBe(true);
    expect(isMonthKey("2026-01")).toBe(true);
    expect(isMonthKey("2026-12")).toBe(true);
  });

  test("rechaza lo que no es un mes", () => {
    for (const bad of ["2026-13", "2026-00", "2026-1", "26-10", "2026/10", "2026-10-01", "octubre", "", " 2026-10", "2026-10 ", "1999-12"]) {
      expect(isMonthKey(bad)).toBe(false);
    }
  });
});

describe("currentMonthKey", () => {
  test("usa la hora de El Salvador (UTC-6), no la de UTC", () => {
    // 1 de noviembre 05:30 UTC = 31 de octubre 23:30 en El Salvador
    expect(currentMonthKey(new Date("2026-11-01T05:30:00Z"))).toBe("2026-10");
    expect(currentMonthKey(new Date("2026-11-01T06:00:00Z"))).toBe("2026-11");
    expect(currentMonthKey(new Date("2026-10-28T15:00:00Z"))).toBe("2026-10");
  });
});

describe("lastMonths", () => {
  test("trae los últimos 12 meses, el más reciente primero", () => {
    const months = lastMonths(new Date("2026-10-28T15:00:00Z"));
    expect(REPORT_MONTHS).toBe(12);
    expect(months).toHaveLength(12);
    expect(months[0]).toBe("2026-10");
    expect(months[11]).toBe("2025-11");
  });

  test("cruza el cambio de año", () => {
    expect(lastMonths(new Date("2026-02-10T15:00:00Z"), 4)).toEqual(["2026-02", "2026-01", "2025-12", "2025-11"]);
  });

  test("todos son meses válidos y distintos", () => {
    const months = lastMonths(new Date("2027-01-01T12:00:00Z"));
    expect(months.every(isMonthKey)).toBe(true);
    expect(new Set(months).size).toBe(12);
  });
});

describe("monthLabel", () => {
  test("escribe el mes en español", () => {
    expect(monthLabel("2026-10")).toBe("octubre de 2026");
    expect(monthLabel("2026-01")).toBe("enero de 2026");
    expect(monthLabel("2025-12")).toBe("diciembre de 2025");
  });
});

describe("reportFilename", () => {
  test("lleva el mes", () => {
    expect(reportFilename("2026-10")).toBe("reporte-trazabilidad-2026-10.pdf");
  });
});
