import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { POLYMER_CODES, type PolymerCode } from "@/lib/domain/polymers";
import type { Database } from "@/types/database";

import type { MyCommission } from "./by-month";
import { monthFirstDay, monthRange, type MonthKey } from "./month";
import { summaryFromRpc, type CommissionSummaryRow } from "./totals";

type Client = SupabaseClient<Database>;

/** Una comisión del mes con los datos de la entrega (peso y fecha) cuando se pudieron leer. */
export type CommissionDetail = MyCommission & {
  collectorId: string;
  pickupId: string;
  confirmedLb: number | null;
  completedAt: string | null;
  voucherCode: string | null;
  polymerCode: PolymerCode | null;
};

export type CommissionMonth = {
  summary: CommissionSummaryRow[];
  details: CommissionDetail[];
  /** No se pudo leer el peso ni la fecha de cada entrega (ver loadPickupFacts). */
  factsMissing: boolean;
};

const COMMISSION_FIELDS = "id, pickup_id, collector_id, gross_amount, pct, amount, status, created_at, paid_at";

type CommissionRow = Pick<
  Database["public"]["Tables"]["commissions"]["Row"],
  "id" | "pickup_id" | "collector_id" | "gross_amount" | "pct" | "amount" | "status" | "created_at" | "paid_at"
>;

function toMyCommission(r: CommissionRow): MyCommission {
  return {
    id: r.id,
    grossAmount: Number(r.gross_amount),
    pct: Number(r.pct),
    amount: Number(r.amount),
    status: r.status,
    createdAt: r.created_at,
    paidAt: r.paid_at,
  };
}

const chunks = <T,>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

type PickupFacts = Map<
  string,
  { confirmedLb: number | null; completedAt: string | null; voucherCode: string | null; polymerCode: PolymerCode | null }
>;

const asPolymer = (code: string | undefined): PolymerCode | null =>
  code && (POLYMER_CODES as string[]).includes(code) ? (code as PolymerCode) : null;

/**
 * Peso, fecha, comprobante y plástico de las entregas que dieron comisión. El administrador no lee
 * pickups ni lots (RLS), así que lo pide a commission_pickup_facts: una función de solo administrador
 * que devuelve únicamente esos campos y solo de entregas con comisión.
 */
async function loadPickupFacts(supabase: Client, pickupIds: string[]): Promise<PickupFacts> {
  const facts: PickupFacts = new Map();
  for (const ids of chunks(pickupIds, 100)) {
    const { data, error } = await supabase.rpc("commission_pickup_facts", { p_pickup_ids: ids });
    if (error) throw new Error(error.message);
    for (const p of data ?? []) {
      facts.set(p.pickup_id, {
        confirmedLb: p.confirmed_lb === null ? null : Number(p.confirmed_lb),
        completedAt: p.completed_at,
        voucherCode: p.voucher_code,
        polymerCode: asPolymer(p.polymer_code),
      });
    }
  }
  return facts;
}

/** Resumen por comprador y detalle de cada comisión del mes (solo administrador). */
export async function loadCommissionMonth(supabase: Client, month: MonthKey): Promise<CommissionMonth> {
  const { from, to } = monthRange(month);
  const [summary, commissions] = await Promise.all([
    supabase.rpc("commission_summary", { p_month: monthFirstDay(month) }),
    supabase.from("commissions").select(COMMISSION_FIELDS).gte("created_at", from).lt("created_at", to).order("created_at"),
  ]);
  if (summary.error) throw new Error(summary.error.message);
  if (commissions.error) throw new Error(commissions.error.message);

  const rows = commissions.data ?? [];
  let facts: PickupFacts = new Map();
  let factsMissing = false;
  try {
    facts = await loadPickupFacts(supabase, rows.map((r) => r.pickup_id));
  } catch {
    factsMissing = true; // si falla la lectura, la tabla sigue mostrando montos y estado
  }

  return {
    summary: summaryFromRpc(summary.data ?? []),
    details: rows.map((r) => {
      const fact = facts.get(r.pickup_id);
      return {
        ...toMyCommission(r),
        collectorId: r.collector_id,
        pickupId: r.pickup_id,
        confirmedLb: fact?.confirmedLb ?? null,
        completedAt: fact?.completedAt ?? null,
        voucherCode: fact?.voucherCode ?? null,
        polymerCode: fact?.polymerCode ?? null,
      };
    }),
    factsMissing,
  };
}

/** Las comisiones del comprador con sesión (la política de commissions solo le deja ver las suyas). */
export async function loadMyCommissions(supabase: Client, collectorId: string): Promise<MyCommission[]> {
  const { data, error } = await supabase
    .from("commissions")
    .select(COMMISSION_FIELDS)
    .eq("collector_id", collectorId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map(toMyCommission);
}
