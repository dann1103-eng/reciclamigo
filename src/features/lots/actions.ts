"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import { firstIssue, publishLotSchema, type PublishLotInput } from "./schemas";
import type { ActionResult } from "./types";

/** Publica un lote. La ubicación y el precio los fija la base (RPC publish_lot). */
export async function publishLot(input: PublishLotInput): Promise<ActionResult<{ lotId: string }>> {
  const parsed = publishLotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const lot = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("publish_lot", {
    p_polymer_code: lot.polymerCode,
    p_estimated_kg: lot.estimatedKg,
    p_pickup_from: lot.pickupFrom,
    p_pickup_to: lot.pickupTo,
    p_modality: lot.modality,
    p_photo_urls: lot.photoUrls,
    p_notes: lot.notes ?? null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/comercio");
  revalidatePath("/reciclador");
  return { ok: true, data: { lotId: data } };
}

/** El reciclador reserva un lote. Si otro llegó antes, la base responde "El lote ya no está disponible". */
export async function reserveLot(lotId: string): Promise<ActionResult<{ pickupId: string }>> {
  if (typeof lotId !== "string" || !lotId) return { ok: false, error: "Lote inválido" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reserve_lot", { p_lot_id: lotId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/reciclador");
  revalidatePath("/reciclador/retiros");
  revalidatePath("/comercio");
  return { ok: true, data: { pickupId: data } };
}
