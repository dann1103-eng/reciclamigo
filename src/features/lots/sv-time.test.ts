import { describe, expect, test } from "vitest";

import { svDateInput, svDateTimeToIso } from "./sv-time";

describe("hora de El Salvador (UTC-6)", () => {
  test("convierte fecha y hora locales a ISO en UTC", () => {
    expect(svDateTimeToIso("2026-10-21", "09:00")).toBe("2026-10-21T15:00:00.000Z");
    expect(svDateTimeToIso("2026-10-21", "23:30")).toBe("2026-10-22T05:30:00.000Z");
  });

  test("da la fecha local de hoy o de mañana para el selector", () => {
    const lateNightUtc = new Date("2026-10-21T03:00:00Z"); // 20 oct, 21:00 en El Salvador
    expect(svDateInput(lateNightUtc)).toBe("2026-10-20");
    expect(svDateInput(lateNightUtc, 1)).toBe("2026-10-21");
  });
});
