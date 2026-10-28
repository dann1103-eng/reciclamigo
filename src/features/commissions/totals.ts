import type { Database } from "@/types/database";

type SummaryRpcRow = Database["public"]["Functions"]["commission_summary"]["Returns"][number];

/** Una fila del resumen mensual por comprador (commission_summary). */
export type CommissionSummaryRow = {
  collectorId: string;
  collectorName: string;
  deliveries: number;
  grossAmount: number;
  commissionAmount: number;
  pendingAmount: number;
  paidAmount: number;
};

export type CommissionTotals = Omit<CommissionSummaryRow, "collectorId" | "collectorName">;

const cents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// numeric de Postgres: según la versión llega como número o como texto.
export function summaryFromRpc(rows: SummaryRpcRow[]): CommissionSummaryRow[] {
  return rows.map((r) => ({
    collectorId: r.collector_id,
    collectorName: r.collector_name,
    deliveries: Number(r.deliveries),
    grossAmount: Number(r.gross_amount),
    commissionAmount: Number(r.commission_amount),
    pendingAmount: Number(r.pending_amount),
    paidAmount: Number(r.paid_amount),
  }));
}

/** Totales del pie de la tabla, redondeados a centavos. */
export function sumSummary(rows: CommissionSummaryRow[]): CommissionTotals {
  const sum = (pick: (r: CommissionSummaryRow) => number) => cents(rows.reduce((acc, r) => acc + pick(r), 0));
  return {
    deliveries: rows.reduce((acc, r) => acc + r.deliveries, 0),
    grossAmount: sum((r) => r.grossAmount),
    commissionAmount: sum((r) => r.commissionAmount),
    pendingAmount: sum((r) => r.pendingAmount),
    paidAmount: sum((r) => r.paidAmount),
  };
}
