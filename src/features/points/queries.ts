import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { earnedThisMonth, entryFromRow, svMonthStart, type LedgerEntry } from "./ledger";

type Client = SupabaseClient<Database>;

/** Cuántos movimientos recientes se muestran en el historial. */
export const HISTORY_LIMIT = 50;

export type PointsData = {
  displayName: string;
  /** Saldo vigente (sin caducados ni canjeados), de points_balance(). */
  balance: number;
  /** Movimientos recientes, del más nuevo al más viejo. */
  history: LedgerEntry[];
  /** Puntos ganados que aún no caducan ni se canjearon del todo, del que vence primero al último. */
  active: LedgerEntry[];
  earnedThisMonth: number;
};

/** Saldo, historial y caducidades de un perfil. RLS: cada quien lee solo sus puntos. */
export async function fetchPoints(supabase: Client, profileId: string, now: Date = new Date()): Promise<PointsData> {
  const [balance, history, active, month, profile] = await Promise.all([
    supabase.rpc("points_balance", { p_profile: profileId }),
    supabase
      .from("points_ledger")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT),
    supabase
      .from("points_ledger")
      .select("*")
      .eq("profile_id", profileId)
      .eq("kind", "ganado")
      .gt("remaining", 0)
      .gt("expires_at", now.toISOString())
      .order("expires_at", { ascending: true }),
    supabase
      .from("points_ledger")
      .select("*")
      .eq("profile_id", profileId)
      .eq("kind", "ganado")
      .gte("created_at", svMonthStart(now).toISOString()),
    supabase.from("profiles").select("display_name").eq("id", profileId).maybeSingle(),
  ]);

  const failed = [balance, history, active, month, profile].find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  return {
    displayName: profile.data?.display_name ?? "",
    balance: Number(balance.data ?? 0),
    history: (history.data ?? []).map(entryFromRow),
    active: (active.data ?? []).map(entryFromRow),
    earnedThisMonth: earnedThisMonth((month.data ?? []).map(entryFromRow), now),
  };
}
