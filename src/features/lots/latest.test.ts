import { describe, expect, test } from "vitest";

import { createLatestGuard } from "./latest";

describe("createLatestGuard", () => {
  test("solo la última petición iniciada cuenta, aunque las respuestas lleguen desordenadas", () => {
    const guard = createLatestGuard();
    const first = guard.next(); // 1 km
    const second = guard.next(); // 5 km, el usuario cambió rápido
    expect(guard.isLatest(second)).toBe(true);
    expect(guard.isLatest(first)).toBe(false); // la respuesta de 1 km llega tarde: se descarta
  });
});
