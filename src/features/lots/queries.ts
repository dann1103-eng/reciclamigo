import type { SupabaseClient } from "@supabase/supabase-js";

import type { PolymerCode } from "@/lib/domain/polymers";
import { parsePoint, type LatLng } from "@/lib/geo";
import type { Database } from "@/types/database";

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
