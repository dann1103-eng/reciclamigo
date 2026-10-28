import type { SupabaseClient } from "@supabase/supabase-js";

import type { PolymerCode } from "@/lib/domain/polymers";
import type { LotStatus, Modality } from "@/lib/domain/types";
import { parsePoint, type LatLng } from "@/lib/geo";
import type { Database } from "@/types/database";

import type { MyPickup } from "./pickups";
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

/** WhatsApp de un comercio o reciclador (profile_private; la alcaldía no lo ve). */
export async function fetchWhatsapp(supabase: Client, profileId: string): Promise<string | null> {
  const { data } = await supabase.from("profile_private").select("whatsapp").eq("id", profileId).maybeSingle();
  return data?.whatsapp ?? null;
}

/** Ubicación registrada del reciclador (profile_private, solo comercios y recicladores la leen). */
export async function fetchCollectorPoint(supabase: Client, collectorId: string): Promise<LatLng | null> {
  const { data } = await supabase.from("profile_private").select("location").eq("id", collectorId).maybeSingle();
  return parsePoint(data?.location);
}

const MY_LOT_FIELDS =
  "id, polymer_code, estimated_lb, price_per_lb, modality, status, pickup_from, pickup_to, created_at, pickups(id, collector_id, proposed_lb, proposed_price_per_lb, confirmed_lb, total_amount, voucher_code, completed_at, collector:profiles!pickups_collector_id_fkey(display_name, profile_private(whatsapp)), ratings(rater_id, stars))";

type RawPickup = {
  id: string;
  collector_id: string;
  proposed_lb: number | null;
  proposed_price_per_lb: number | null;
  confirmed_lb: number | null;
  total_amount: number | null;
  voucher_code: string | null;
  completed_at: string | null;
  collector: { display_name: string; profile_private: { whatsapp: string | null } | null } | null;
  ratings: { rater_id: string; stars: number }[];
};

// PostgREST devuelve la relación 1 a 1 como objeto, pero según la versión puede venir como arreglo.
const one = <T,>(value: T | T[] | null | undefined): T | null => (Array.isArray(value) ? (value[0] ?? null) : (value ?? null));
const numOrNull = (value: number | string | null | undefined) => (value === null || value === undefined ? null : Number(value));

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
        estimatedLb: Number(row.estimated_lb),
        pricePerLb: Number(row.price_per_lb),
        modality: row.modality as Modality,
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
              proposedLb: numOrNull(p.proposed_lb),
              proposedPricePerLb: numOrNull(p.proposed_price_per_lb),
              confirmedLb: numOrNull(p.confirmed_lb),
              totalAmount: numOrNull(p.total_amount),
              voucherCode: p.voucher_code,
              completedAt: p.completed_at,
              myRatingGiven: (p.ratings ?? []).some((r) => r.rater_id === generatorId),
              myRating: (p.ratings ?? []).find((r) => r.rater_id === generatorId)?.stars ?? null,
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

const MY_PICKUP_FIELDS =
  "id, lot_id, proposed_lb, proposed_price_per_lb, confirmed_lb, total_amount, voucher_code, completed_at, ratings(rater_id, stars), lot:lots!pickups_lot_id_fkey(polymer_code, estimated_lb, status, pickup_from, pickup_to, price_per_lb, modality, generator_id, generator:profiles!lots_generator_id_fkey(display_name, profile_private(whatsapp)))";

type RawMyPickup = {
  id: string;
  lot_id: string;
  proposed_lb: number | null;
  proposed_price_per_lb: number | null;
  confirmed_lb: number | null;
  total_amount: number | null;
  voucher_code: string | null;
  completed_at: string | null;
  ratings: { rater_id: string; stars: number }[] | null;
  lot: {
    polymer_code: string;
    estimated_lb: number;
    status: string;
    pickup_from: string;
    pickup_to: string;
    price_per_lb: number;
    modality: string;
    generator_id: string;
    generator: { display_name: string; profile_private: { whatsapp: string | null } | null } | null;
  } | null;
};

/** Retiros del reciclador con su lote y el comercio (para "Mis retiros"). */
export async function fetchMyPickups(supabase: Client, collectorId: string): Promise<MyPickup[]> {
  const { data, error } = await supabase
    .from("pickups")
    .select(MY_PICKUP_FIELDS)
    .eq("collector_id", collectorId)
    .order("reserved_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);

  return (data as unknown as RawMyPickup[]).flatMap((row): MyPickup[] => {
    const lot = one(row.lot);
    if (!lot) return [];
    const generator = one(lot.generator);
    return [
      {
        id: row.id,
        lotId: row.lot_id,
        polymerCode: lot.polymer_code as PolymerCode,
        estimatedLb: Number(lot.estimated_lb),
        pricePerLb: Number(lot.price_per_lb),
        modality: lot.modality as Modality,
        status: lot.status as LotStatus,
        pickupFrom: lot.pickup_from,
        pickupTo: lot.pickup_to,
        generatorId: lot.generator_id,
        generatorName: generator?.display_name ?? "Comercio",
        generatorWhatsapp: one(generator?.profile_private)?.whatsapp ?? null,
        proposedLb: numOrNull(row.proposed_lb),
        proposedPricePerLb: numOrNull(row.proposed_price_per_lb),
        confirmedLb: numOrNull(row.confirmed_lb),
        totalAmount: numOrNull(row.total_amount),
        voucherCode: row.voucher_code,
        completedAt: row.completed_at,
        myRatingGiven: (row.ratings ?? []).some((r) => r.rater_id === collectorId),
        myRating: (row.ratings ?? []).find((r) => r.rater_id === collectorId)?.stars ?? null,
      },
    ];
  });
}

export type LotSummary = {
  id: string;
  polymerCode: PolymerCode;
  estimatedLb: number;
  pricePerLb: number;
  modality: Modality;
  status: LotStatus;
  pickupFrom: string;
  pickupTo: string;
  generatorId: string;
  generatorName: string;
};

/** Un lote por id (para /lote/[id], el enlace que va en el mensaje de WhatsApp). RLS: lo ven comercios y recicladores. */
export async function fetchLotSummary(supabase: Client, lotId: string): Promise<LotSummary | null> {
  const { data, error } = await supabase
    .from("lots")
    .select("id, polymer_code, estimated_lb, price_per_lb, modality, status, pickup_from, pickup_to, generator_id, generator:profiles!lots_generator_id_fkey(display_name)")
    .eq("id", lotId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as unknown as {
    id: string;
    polymer_code: string;
    estimated_lb: number;
    price_per_lb: number;
    modality: string;
    status: string;
    pickup_from: string;
    pickup_to: string;
    generator_id: string;
    generator: { display_name: string } | { display_name: string }[] | null;
  };
  return {
    id: row.id,
    polymerCode: row.polymer_code as PolymerCode,
    estimatedLb: Number(row.estimated_lb),
    pricePerLb: Number(row.price_per_lb),
    modality: row.modality as Modality,
    status: row.status as LotStatus,
    pickupFrom: row.pickup_from,
    pickupTo: row.pickup_to,
    generatorId: row.generator_id,
    generatorName: one(row.generator)?.display_name ?? "Comercio",
  };
}
