import { describe, expect, test } from "vitest";

import { groupByMonth, type MyCommission } from "./by-month";

const c = (id: string, createdAt: string, amount: number, status: "pendiente" | "cobrada" = "pendiente", grossAmount = amount * 33.33): MyCommission => ({
  id,
  createdAt,
  grossAmount,
  pct: 3,
  amount,
  status,
  paidAt: status === "cobrada" ? createdAt : null,
});

describe("groupByMonth", () => {
  test("agrupa por mes de El Salvador, del más reciente al más antiguo", () => {
    const groups = groupByMonth([
      c("a", "2026-09-15T15:00:00Z", 1),
      c("b", "2026-10-20T15:00:00Z", 2),
      c("c", "2026-11-01T05:30:00Z", 3), // 23:30 del 31 de octubre en El Salvador
    ]);
    expect(groups.map((g) => g.month)).toEqual(["2026-10", "2026-09"]);
    expect(groups[0].rows.map((r) => r.id)).toEqual(["c", "b"]);
  });

  test("dentro del mes, lo más reciente primero", () => {
    const [oct] = groupByMonth([c("a", "2026-10-02T15:00:00Z", 1), c("b", "2026-10-25T15:00:00Z", 1), c("c", "2026-10-10T15:00:00Z", 1)]);
    expect(oct.rows.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  test("suma valor, comisión, pendiente y cobrada del mes", () => {
    const [oct] = groupByMonth([
      c("a", "2026-10-02T15:00:00Z", 1.5, "pendiente", 50),
      c("b", "2026-10-05T15:00:00Z", 0.9, "cobrada", 30),
      c("c", "2026-10-06T15:00:00Z", 0.6, "pendiente", 20),
    ]);
    expect(oct).toMatchObject({ grossAmount: 100, amount: 3, pendingAmount: 2.1, paidAmount: 0.9 });
  });

  test("sin comisiones devuelve una lista vacía", () => {
    expect(groupByMonth([])).toEqual([]);
  });
});
