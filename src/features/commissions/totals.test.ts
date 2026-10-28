import { describe, expect, test } from "vitest";

import { sumSummary, summaryFromRpc } from "./totals";

describe("summaryFromRpc", () => {
  test("convierte las filas de commission_summary() (los numeric pueden llegar como texto)", () => {
    expect(
      summaryFromRpc([
        {
          collector_id: "c1",
          collector_name: "Acopio Norte",
          deliveries: 3,
          gross_amount: "120.50" as unknown as number,
          commission_amount: 3.62,
          pending_amount: 1.81,
          paid_amount: 1.81,
        },
      ]),
    ).toEqual([
      {
        collectorId: "c1",
        collectorName: "Acopio Norte",
        deliveries: 3,
        grossAmount: 120.5,
        commissionAmount: 3.62,
        pendingAmount: 1.81,
        paidAmount: 1.81,
      },
    ]);
  });
});

describe("sumSummary", () => {
  const base = { collectorId: "", collectorName: "" };

  test("suma entregas, valor, comisión, pendiente y cobrada", () => {
    expect(
      sumSummary([
        { ...base, deliveries: 3, grossAmount: 120.5, commissionAmount: 3.62, pendingAmount: 1.81, paidAmount: 1.81 },
        { ...base, deliveries: 1, grossAmount: 40, commissionAmount: 1.2, pendingAmount: 1.2, paidAmount: 0 },
      ]),
    ).toEqual({ deliveries: 4, grossAmount: 160.5, commissionAmount: 4.82, pendingAmount: 3.01, paidAmount: 1.81 });
  });

  test("redondea a centavos: 0.1 + 0.2 no deja 0.30000000000000004", () => {
    const totals = sumSummary([
      { ...base, deliveries: 1, grossAmount: 0.1, commissionAmount: 0.1, pendingAmount: 0.1, paidAmount: 0 },
      { ...base, deliveries: 1, grossAmount: 0.2, commissionAmount: 0.2, pendingAmount: 0.2, paidAmount: 0 },
    ]);
    expect(totals.grossAmount).toBe(0.3);
    expect(totals.pendingAmount).toBe(0.3);
  });

  test("sin filas todo es 0", () => {
    expect(sumSummary([])).toEqual({ deliveries: 0, grossAmount: 0, commissionAmount: 0, pendingAmount: 0, paidAmount: 0 });
  });
});
