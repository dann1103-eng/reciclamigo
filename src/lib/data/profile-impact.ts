import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProfileStats } from "@/lib/domain/badges";
import type { Database } from "@/types/database";

export type ProfileImpactRow = Database["public"]["Views"]["profile_impact"]["Row"];

/** Totales de un perfil (kg, retiros, calificación). Sirve con cliente de servidor o de navegador. */
export async function getProfileImpact(
  supabase: SupabaseClient<Database>,
  profileId: string,
): Promise<ProfileImpactRow | null> {
  const { data, error } = await supabase.from("profile_impact").select("*").eq("profile_id", profileId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

const num = (value: number | string | null | undefined) => (value === null || value === undefined ? 0 : Number(value));

export function profileStatsFromRow(row: ProfileImpactRow): ProfileStats {
  return {
    role: row.role ?? "generador",
    lotsPublished: num(row.lots_published),
    completedCount: num(row.completed_count),
    completedKg: num(row.completed_kg),
    ratingAvg: row.rating_avg === null ? null : Number(row.rating_avg),
    ratingCount: num(row.rating_count),
    verified: row.verified ?? false,
  };
}
