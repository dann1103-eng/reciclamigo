"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import {
  completePickupSchema,
  firstIssue,
  idSchema,
  publishLotSchema,
  ratePickupSchema,
  type CompletePickupInput,
  type PublishLotInput,
  type RatePickupInput,
} from "./schemas";
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
  if (!idSchema.safeParse(lotId).success) return { ok: false, error: "Lote inválido" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reserve_lot", { p_lot_id: lotId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/reciclador");
  revalidatePath("/reciclador/retiros");
  revalidatePath("/comercio");
  return { ok: true, data: { pickupId: data } };
}

/** El comercio confirma que entregó el material al reciclador. */
export async function markDelivered(pickupId: string): Promise<ActionResult> {
  if (!idSchema.safeParse(pickupId).success) return { ok: false, error: "Retiro inválido" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_delivered", { p_pickup_id: pickupId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/comercio");
  revalidatePath("/reciclador/retiros");
  return { ok: true, data: undefined };
}

/** El reciclador confirma los kg reales y cómo se pagó (solo se registra). Devuelve el código del certificado. */
export async function completePickup(input: CompletePickupInput): Promise<ActionResult<{ certificateCode: string }>> {
  const parsed = completePickupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_pickup", {
    p_pickup_id: parsed.data.pickupId,
    p_confirmed_kg: parsed.data.confirmedKg,
    p_payment_method: parsed.data.paymentMethod,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/reciclador/retiros");
  revalidatePath("/comercio");
  return { ok: true, data: { certificateCode: data } };
}

/** Cada parte califica a la otra una vez, cuando el retiro está completado. */
export async function ratePickup(input: RatePickupInput): Promise<ActionResult> {
  const parsed = ratePickupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("rate_pickup", {
    p_pickup_id: parsed.data.pickupId,
    p_stars: parsed.data.stars,
    p_comment: parsed.data.comment || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/comercio");
  revalidatePath("/reciclador/retiros");
  return { ok: true, data: undefined };
}
