import { describe, expect, test } from "vitest";

import {
  describeEntry,
  earnedThisMonth,
  entryFromRow,
  formatPoints,
  monthlyRoom,
  svMonthStart,
  upcomingExpirations,
  type LedgerEntry,
} from "./ledger";

const entry = (over: Partial<LedgerEntry>): LedgerEntry => ({
  id: "x",
  kind: "ganado",
  points: 100,
  remaining: 100,
  expiresAt: "2027-10-28T12:00:00Z",
  note: null,
  createdAt: "2026-10-10T12:00:00Z",
  ...over,
});

describe("svMonthStart", () => {
  test("el mes empieza a las 00:00 de El Salvador (06:00 UTC)", () => {
    expect(svMonthStart(new Date("2026-10-28T12:00:00Z")).toISOString()).toBe("2026-10-01T06:00:00.000Z");
  });

  test("a las 21:00 del 30 de septiembre en El Salvador todavía es septiembre", () => {
    expect(svMonthStart(new Date("2026-10-01T03:00:00Z")).toISOString()).toBe("2026-09-01T06:00:00.000Z");
  });

  test("a las 00:00 del 1 de octubre en El Salvador ya es octubre", () => {
    expect(svMonthStart(new Date("2026-10-01T06:00:00Z")).toISOString()).toBe("2026-10-01T06:00:00.000Z");
  });

  test("diciembre pasa bien al año siguiente", () => {
    expect(svMonthStart(new Date("2027-01-01T05:59:00Z")).toISOString()).toBe("2026-12-01T06:00:00.000Z");
  });
});

describe("earnedThisMonth", () => {
  const now = new Date("2026-10-28T12:00:00Z");

  test("suma solo lo ganado desde el inicio del mes", () => {
    const rows = [
      entry({ points: 120, createdAt: "2026-10-05T12:00:00Z" }),
      entry({ points: 80, createdAt: "2026-10-01T06:00:00Z" }),
      entry({ points: 999, createdAt: "2026-09-30T20:00:00Z" }),
    ];
    expect(earnedThisMonth(rows, now)).toBe(200);
  });

  test("los canjes y ajustes no cuentan como ganados", () => {
    const rows = [
      entry({ points: 120 }),
      entry({ kind: "canje", points: -50, remaining: null, expiresAt: null }),
      entry({ kind: "ajuste", points: 30, remaining: null, expiresAt: null }),
    ];
    expect(earnedThisMonth(rows, now)).toBe(120);
  });

  test("sin movimientos es 0", () => {
    expect(earnedThisMonth([], now)).toBe(0);
  });
});

describe("monthlyRoom", () => {
  test("lo que falta para el tope", () => {
    expect(monthlyRoom(500, 320)).toBe(180);
    expect(monthlyRoom(500, 500)).toBe(0);
    expect(monthlyRoom(500, 520)).toBe(0);
  });

  test("sin tope no hay límite", () => {
    expect(monthlyRoom(null, 320)).toBeNull();
  });
});

describe("upcomingExpirations", () => {
  const now = new Date("2026-10-28T12:00:00Z");

  test("agrupa por día de caducidad y ordena de la más próxima a la más lejana", () => {
    const rows = [
      entry({ id: "a", remaining: 40, expiresAt: "2026-12-10T15:00:00Z" }),
      entry({ id: "b", remaining: 60, expiresAt: "2026-11-15T10:00:00Z" }),
      entry({ id: "c", remaining: 25, expiresAt: "2026-11-15T20:00:00Z" }),
    ];
    const result = upcomingExpirations(rows, now);
    expect(result.map((r) => [r.day, r.points])).toEqual([
      ["2026-11-15", 85],
      ["2026-12-10", 40],
    ]);
  });

  test("el día se cuenta en hora de El Salvador", () => {
    // 03:00 UTC del 16 es todavía el 15 a las 21:00 en El Salvador.
    const [only] = upcomingExpirations([entry({ remaining: 10, expiresAt: "2026-11-16T03:00:00Z" })], now);
    expect(only.day).toBe("2026-11-15");
  });

  test("ignora lo ya caducado, lo ya canjeado por completo y lo que no es ganado", () => {
    const rows = [
      entry({ id: "vencido", remaining: 50, expiresAt: "2026-10-01T00:00:00Z" }),
      entry({ id: "agotado", remaining: 0, expiresAt: "2026-11-20T00:00:00Z" }),
      entry({ id: "canje", kind: "canje", points: -10, remaining: null, expiresAt: null }),
      entry({ id: "vigente", remaining: 15, expiresAt: "2026-11-20T18:00:00Z" }),
    ];
    expect(upcomingExpirations(rows, now).map((r) => r.points)).toEqual([15]);
  });

  test("cuenta los puntos que quedan (remaining), no los ganados originalmente", () => {
    const [only] = upcomingExpirations([entry({ points: 200, remaining: 70, expiresAt: "2026-11-20T18:00:00Z" })], now);
    expect(only.points).toBe(70);
  });

  test("días que faltan, redondeados hacia arriba, y respeta el límite", () => {
    const rows = [
      entry({ remaining: 1, expiresAt: "2026-10-30T11:00:00Z" }),
      entry({ remaining: 1, expiresAt: "2026-11-05T12:00:00Z" }),
      entry({ remaining: 1, expiresAt: "2026-11-20T12:00:00Z" }),
    ];
    const result = upcomingExpirations(rows, now, 2);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.daysLeft)).toEqual([2, 8]);
  });
});

describe("describeEntry", () => {
  test("ganado: suma, con la nota o un texto por defecto", () => {
    expect(describeEntry(entry({ points: 120, note: "Entrega confirmada" }))).toEqual({
      label: "Ganado",
      tone: "ganado",
      points: "+120",
      note: "Entrega confirmada",
    });
    expect(describeEntry(entry({ points: 5, note: null })).note).toBe("Entrega confirmada");
  });

  test("canje: resta, con la nota que escribió el equipo", () => {
    expect(describeEntry(entry({ kind: "canje", points: -300, remaining: null, expiresAt: null, note: "Bono de supermercado" }))).toEqual({
      label: "Canje",
      tone: "canje",
      points: "−300",
      note: "Bono de supermercado",
    });
    expect(describeEntry(entry({ kind: "canje", points: -10, remaining: null, expiresAt: null })).note).toBe("Canje registrado por el equipo");
  });

  test("ajuste: el signo depende del valor", () => {
    expect(describeEntry(entry({ kind: "ajuste", points: 40, remaining: null, expiresAt: null })).points).toBe("+40");
    expect(describeEntry(entry({ kind: "ajuste", points: -40, remaining: null, expiresAt: null })).points).toBe("−40");
    expect(describeEntry(entry({ kind: "ajuste", points: 40, remaining: null, expiresAt: null })).label).toBe("Ajuste");
  });

  test("una nota en blanco usa el texto por defecto", () => {
    expect(describeEntry(entry({ note: "   " })).note).toBe("Entrega confirmada");
  });
});

describe("formatPoints", () => {
  test("separador de miles de El Salvador", () => {
    expect(formatPoints(0)).toBe("0");
    expect(formatPoints(1234)).toMatch(/^1.?234$/);
  });
});

describe("entryFromRow", () => {
  test("pasa la fila de la base al modelo de la app", () => {
    expect(
      entryFromRow({
        id: "1",
        profile_id: "p",
        kind: "ganado",
        points: 90,
        remaining: 90,
        pickup_id: "k",
        expires_at: "2027-10-28T00:00:00Z",
        note: "Entrega confirmada",
        created_at: "2026-10-28T00:00:00Z",
        created_by: null,
      }),
    ).toEqual({
      id: "1",
      kind: "ganado",
      points: 90,
      remaining: 90,
      expiresAt: "2027-10-28T00:00:00Z",
      note: "Entrega confirmada",
      createdAt: "2026-10-28T00:00:00Z",
    });
  });
});
