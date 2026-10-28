import { monthOf, type MonthKey } from "./month";

/** Comisión de una compra confirmada de un comprador de volumen. */
export type MyCommission = {
  id: string;
  grossAmount: number;
  /** % que se aplicó en esa compra (la comisión no cambia si después cambia la configuración). */
  pct: number;
  amount: number;
  status: "pendiente" | "cobrada";
  createdAt: string;
  paidAt: string | null;
};

export type MonthGroup = {
  month: MonthKey;
  rows: MyCommission[];
  grossAmount: number;
  amount: number;
  pendingAmount: number;
  paidAmount: number;
};

const cents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Comisiones por mes de El Salvador: meses y filas de más reciente a más antiguo. */
export function groupByMonth(rows: MyCommission[]): MonthGroup[] {
  const byMonth = new Map<MonthKey, MyCommission[]>();
  for (const row of rows) {
    const month = monthOf(row.createdAt);
    byMonth.set(month, [...(byMonth.get(month) ?? []), row]);
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, monthRows]) => {
      const sorted = [...monthRows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const sum = (pick: (r: MyCommission) => number) => cents(sorted.reduce((acc, r) => acc + pick(r), 0));
      return {
        month,
        rows: sorted,
        grossAmount: sum((r) => r.grossAmount),
        amount: sum((r) => r.amount),
        pendingAmount: sum((r) => (r.status === "pendiente" ? r.amount : 0)),
        paidAmount: sum((r) => (r.status === "cobrada" ? r.amount : 0)),
      };
    });
}
