import type { SupabaseClient } from "@supabase/supabase-js";

import type { PolymerCode } from "@/lib/domain/polymers";
import type { Modality } from "@/lib/domain/types";
import type { Database } from "@/types/database";

import { countDeliveriesByCollector, orderCollectors, type CollectorOption } from "./collectors";
import type { ScheduledPickup } from "./format";
import { toHHMM } from "./format";

type Client = SupabaseClient<Database>;

type RawScheduled = {
  id: string;
  collector_id: string;
  polymer_code: string;
  estimated_lb: number | string;
  modality: Modality;
  weekday: number;
  start_time: string;
  end_time: string;
  notes: string | null;
  active: boolean;
  // PostgREST devuelve la relación a uno como objeto, pero según la versión puede venir como arreglo.
  collector: { display_name: string } | { display_name: string }[] | null;
};

// Lunes primero: así se lee una semana en El Salvador.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Retiros programados del comercio, en orden de la semana (lunes a domingo) y hora. */
export async function fetchScheduled(supabase: Client, generatorId: string): Promise<ScheduledPickup[]> {
  const { data, error } = await supabase
    .from("scheduled_pickups")
    .select(
      "id, collector_id, polymer_code, estimated_lb, modality, weekday, start_time, end_time, notes, active, collector:profiles!scheduled_pickups_collector_id_fkey(display_name)",
    )
    .eq("generator_id", generatorId);
  if (error) throw new Error(error.message);

  return (data as unknown as RawScheduled[])
    .map((row): ScheduledPickup => {
      const collector = Array.isArray(row.collector) ? (row.collector[0] ?? null) : row.collector;
      return {
        id: row.id,
        collectorId: row.collector_id,
        collectorName: collector?.display_name ?? null,
        polymerCode: row.polymer_code as PolymerCode,
        estimatedLb: Number(row.estimated_lb),
        modality: row.modality,
        weekday: row.weekday,
        startTime: toHHMM(row.start_time),
        endTime: toHHMM(row.end_time),
        notes: row.notes,
        active: row.active,
      };
    })
    .sort((a, b) => WEEK_ORDER.indexOf(a.weekday) - WEEK_ORDER.indexOf(b.weekday) || a.startTime.localeCompare(b.startTime));
}

/**
 * Recicladores que puede elegir el comercio como "de confianza": primero los que ya le
 * completaron entregas y luego todos los demás. La RLS de pickups solo deja ver al comercio
 * los retiros de sus propios lotes, así que no hace falta filtrar por comercio aquí.
 */
export async function fetchCollectorOptions(supabase: Client): Promise<{ known: CollectorOption[]; others: CollectorOption[] }> {
  const [profiles, pickups] = await Promise.all([
    supabase.from("profiles").select("id, display_name").eq("role", "valorizador").order("display_name"),
    supabase.from("pickups").select("collector_id").not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(1000),
  ]);
  if (profiles.error) throw new Error(profiles.error.message);
  if (pickups.error) throw new Error(pickups.error.message);

  return orderCollectors(
    (profiles.data ?? []).map((p) => ({ id: p.id, name: p.display_name })),
    countDeliveriesByCollector(pickups.data ?? []),
  );
}
