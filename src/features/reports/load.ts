import type { Database } from "@/types/database";

import { historyRowFromRpc, type HistoryRow } from "./history";
import type { ReportRow } from "./model";

type MonthlyFn = Database["public"]["Functions"]["monthly_report"];
type HistoryFn = Database["public"]["Functions"]["generator_history"];
type RpcError = { message: string; hint?: string | null };

// Lo único que necesitan del cliente Supabase: permite probarlos sin red.
export type MonthlyReportRpc = {
  rpc(fn: "monthly_report", args: MonthlyFn["Args"]): PromiseLike<{ data: MonthlyFn["Returns"] | null; error: RpcError | null }>;
};
export type HistoryRpc = {
  rpc(fn: "generator_history", args: HistoryFn["Args"]): PromiseLike<{ data: HistoryFn["Returns"] | null; error: RpcError | null }>;
};

export type MonthlyReportResult =
  | { ok: true; rows: ReportRow[] }
  | { ok: false; error: string; code?: "requiere_plan" };

/**
 * Entregas confirmadas de un mes ("2026-10", hora de El Salvador). La base exige el plan: sin él
 * responde con hint "requiere_plan" y un mensaje en español, que se conserva tal cual.
 */
export async function loadMonthlyReport(supabase: MonthlyReportRpc, month: string): Promise<MonthlyReportResult> {
  const { data, error } = await supabase.rpc("monthly_report", { p_month: `${month}-01` });
  if (error) {
    return error.hint === "requiere_plan" ? { ok: false, error: error.message, code: "requiere_plan" } : { ok: false, error: error.message };
  }
  return {
    ok: true,
    rows: (data ?? []).map((r) => ({
      voucherCode: r.voucher_code,
      completedAt: r.completed_at,
      collectorName: r.collector_name,
      polymerCode: r.polymer_code,
      confirmedLb: Number(r.confirmed_lb),
    })),
  };
}

/** Historial del comercio. La base ya limita a los últimos días del plan gratis. */
export async function loadHistory(supabase: HistoryRpc): Promise<{ ok: true; rows: HistoryRow[] } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("generator_history", {});
  if (error) return { ok: false, error: error.message };
  return { ok: true, rows: (data ?? []).map(historyRowFromRpc) };
}
