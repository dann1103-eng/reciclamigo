import { describe, expect, test } from "vitest";

import { formatPickupWindow } from "./format-window";

// Fecha en hora de El Salvador (UTC-6).
const sv = (local: string) => new Date(`${local.replace(" ", "T")}:00-06:00`);
const now = new Date("2026-10-20T15:00:00Z"); // martes 20 de octubre, 9:00 en El Salvador

describe("formatPickupWindow", () => {
  test("hoy, mañana o día con fecha", () => {
    expect(formatPickupWindow(sv("2026-10-20 14:00"), sv("2026-10-20 16:00"), now)).toBe("Hoy 14:00–16:00");
    expect(formatPickupWindow(sv("2026-10-21 09:00"), sv("2026-10-21 11:00"), now)).toBe("Mañana 9:00–11:00");
    expect(formatPickupWindow(sv("2026-10-23 09:00"), sv("2026-10-23 11:00"), now)).toBe("vie 23 oct 9:00–11:00");
  });

  test("usa la hora de El Salvador aunque el servidor corra en UTC", () => {
    // 21:00 del 20 en El Salvador ya es 21 en UTC: sigue siendo "Hoy".
    expect(formatPickupWindow(sv("2026-10-20 20:00"), sv("2026-10-20 21:30"), now)).toBe("Hoy 20:00–21:30");
  });
});
