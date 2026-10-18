import type { SupabaseClient } from "@supabase/supabase-js";

import type { PolymerCode } from "@/lib/domain/polymers";
import type { LotStatus } from "@/lib/domain/types";
import { parsePoint, type LatLng } from "@/lib/geo";
import type { Database } from "@/types/database";

import { sortMyLots, type MyLot } from "./status";
import type { NearbyLot, RadiusM } from "./types";

type Client = SupabaseClient<Database>;

/** Lotes publicados dentro del radio, ordenados por distancia. Sin polímeros = todos. */
export async function fetchNearbyLots(
  supabase: Client,
  p: { lat: number; lng: number; radiusM: RadiusM; polymers: PolymerCode[] | null },
): Promise<NearbyLot[]> {
  const { data, error } = await supabase.rpc("nearby_lots", {
    p_lat: p.lat,
    p_lng: p.lng,
    p_radius_m: p.radiusM,
    p_polymers: p.polymers?.length ? p.polymers : null,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Ubicación registrada del reciclador (profile_private, solo comercios y recicladores la leen). */
export async function fetchCollectorPoint(supabase: Client, collectorId: string): Promise<LatLng | null> {
  const { data } = await supabase.from("profile_private").select("location").eq("id", collectorId).maybeSingle();
  return parsePoint(data?.location);
}

const MY_LOT_FIELDS =
  "id, polymer_code, estimated_kg, status, pickup_from, pickup_to, created_at, pickups(id, collector_id, confirmed_kg, total_amount, certificate_code, completed_at, collector:profiles!pickups_collector_id_fkey(display_name, profile_private(whatsapp)), ratings(rater_id))";

type RawPickup = {
  id: string;
  collector_id: string;
  confirmed_kg: number | null;
  total_amount: number | null;
  certificate_code: string | null;
  completed_at: string | null;
  collector: { display_name: string; profile_private: { whatsapp: string | null } | null } | null;
  ratings: { rater_id: string }[];
};

// PostgREST devuelve la relación 1 a 1 como objeto, pero según la versión puede venir como arreglo.
const one = <T,>(value: T | T[] | null | undefined): T | null => (Array.isArray(value) ? (value[0] ?? null) : (value ?? null));

const THIRTY_DAYS_MS = 30 * 86_400_000;

/** Lotes del comercio: activos y completados de los últimos 30 días, lo que pide acción primero. */
export async function fetchMyLots(supabase: Client, generatorId: string, now: Date = new Date()): Promise<MyLot[]> {
  const { data, error } = await supabase
    .from("lots")
    .select(MY_LOT_FIELDS)
    .eq("generator_id", generatorId)
    .neq("status", "cancelado")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);

  const lots = (data as unknown as (Record<string, unknown> & { pickups: RawPickup | RawPickup[] | null })[]).map(
    (row): MyLot => {
      const p = one(row.pickups);
      const collector = one(p?.collector);
      return {
        id: row.id as string,
        polymerCode: row.polymer_code as PolymerCode,
        estimatedKg: Number(row.estimated_kg),
        status: row.status as LotStatus,
        pickupFrom: row.pickup_from as string,
        pickupTo: row.pickup_to as string,
        createdAt: row.created_at as string,
        pickup: p
          ? {
              id: p.id,
              collectorId: p.collector_id,
              collectorName: collector?.display_name ?? "Reciclador",
              collectorWhatsapp: one(collector?.profile_private)?.whatsapp ?? null,
              confirmedKg: p.confirmed_kg === null ? null : Number(p.confirmed_kg),
              totalAmount: p.total_amount === null ? null : Number(p.total_amount),
              certificateCode: p.certificate_code,
              completedAt: p.completed_at,
              myRatingGiven: (p.ratings ?? []).some((r) => r.rater_id === generatorId),
            }
          : null,
      };
    },
  );

  const recent = lots.filter(
    (l) => l.status !== "completado" || now.getTime() - new Date(l.pickup?.completedAt ?? l.createdAt).getTime() <= THIRTY_DAYS_MS,
  );
  return sortMyLots(recent);
}
