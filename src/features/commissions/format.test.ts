import { describe, expect, test } from "vitest";

import { formatPct } from "./format";

describe("formatPct", () => {
  test("el porcentaje va con un espacio antes del signo", () => {
    expect(formatPct(3)).toBe("3 %");
  });

  test("conserva hasta dos decimales", () => {
    expect(formatPct(3.5)).toBe("3.5 %");
    expect(formatPct(2.25)).toBe("2.25 %");
  });
});
