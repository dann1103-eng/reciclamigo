"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { failure, type ActionResult } from "@/lib/action-result";
import { processDueNotifications } from "@/lib/notify/queue";
import { createClient } from "@/lib/supabase/server";

import {
  completePickupSchema,
  firstIssue,
  idSchema,
  proposeDeliverySchema,
  publishLotSchema,
  ratePickupSchema,
  type CompletePickupInput,
  type ProposeDeliveryInput,
  type PublishLotInput,
  type RatePickupInput,
} from "./schemas";

/** Manda ya los avisos sin retraso; los demás los saca el cron. Un fallo aquí nunca rompe la acción. */
function sendDueNotifications() {
  after(async () => {
    try {
      await processDueNotifications();
    } catch {
      // el cron de Vercel lo reintenta
    }
  });
}

/**
 * Publica un lote. La ubicación y el precio de referencia los fija la base (RPC publish_lot),
 * que también aplica el límite de lotes gratis del mes: el aviso llega en `code: "limite_gratis"`.
 */
export async function publishLot(input: PublishLotInput): Promise<ActionResult<{ lotId: string }>> {
  const parsed = publishLotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const lot = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("publish_lot", {
    p_polymer_code: lot.polymerCode,
    p_estimated_lb: lot.estimatedLb,
    p_pickup_from: lot.pickupFrom,
    p_pickup_to: lot.pickupTo,
    p_modality: lot.modality,
    p_photo_urls: lot.photoUrls,
    p_notes: lot.notes ?? null,
  });
  if (error) return failure(error);

  revalidatePath("/comercio");
  revalidatePath("/reciclador");
  sendDueNotifications();
  return { ok: true, data: { lotId: data } };
}

/** Vuelve a publicar un lote igual con un toque (la ventana de retiro pasa a un día futuro). */
export async function repeatLot(lotId: string): Promise<ActionResult<{ lotId: string }>> {
  if (!idSchema.safeParse(lotId).success) return { ok: false, error: "Lote inválido" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("repeat_lot", { p_lot_id: lotId });
  if (error) return failure(error);
  revalidatePath("/comercio");
  revalidatePath("/comercio/historial");
  revalidatePath("/reciclador");
  sendDueNotifications();
  return { ok: true, data: { lotId: data } };
}

/** El reciclador reserva un lote. Si otro llegó antes, la base responde "El lote ya no está disponible". */
export async function reserveLot(lotId: string): Promise<ActionResult<{ pickupId: string }>> {
  if (!idSchema.safeParse(lotId).success) return { ok: false, error: "Lote inválido" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reserve_lot", { p_lot_id: lotId });
  if (error) return failure(error);
  revalidatePath("/reciclador");
  revalidatePath("/reciclador/retiros");
  revalidatePath("/comercio");
  sendDueNotifications();
  return { ok: true, data: { pickupId: data } };
}

/**
 * El comercio registra la entrega con el peso real y el precio final. Todavía no cuenta: el
 * reciclador la acepta o la corrige (complete_pickup) y solo entonces hay comprobante.
 */
export async function proposeDelivery(input: ProposeDeliveryInput): Promise<ActionResult> {
  const parsed = proposeDeliverySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("propose_delivery", {
    p_pickup_id: parsed.data.pickupId,
    p_lb: parsed.data.lb,
    p_price_per_lb: parsed.data.pricePerLb ?? null,
  });
  if (error) return failure(error);
  revalidatePath("/comercio");
  revalidatePath("/reciclador/retiros");
  sendDueNotifications();
  return { ok: true, data: undefined };
}

/** El reciclador acepta o corrige lo que registró el comercio. Devuelve el código del comprobante. */
export async function completePickup(input: CompletePickupInput): Promise<ActionResult<{ voucherCode: string }>> {
  const parsed = completePickupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_pickup", {
    p_pickup_id: parsed.data.pickupId,
    p_accept: parsed.data.accept,
    p_confirmed_lb: parsed.data.accept ? null : (parsed.data.confirmedLb ?? null),
    p_final_price_per_lb: parsed.data.accept ? null : (parsed.data.finalPricePerLb ?? null),
    p_payment_method: parsed.data.paymentMethod,
  });
  if (error) return failure(error);
  revalidatePath("/reciclador/retiros");
  revalidatePath("/comercio");
  sendDueNotifications();
  return { ok: true, data: { voucherCode: data } };
}

/** El comercio o el reciclador suelta una reserva que todavía no tiene entrega: el lote se publica de nuevo. */
export async function releaseReservation(pickupId: string): Promise<ActionResult> {
  if (!idSchema.safeParse(pickupId).success) return { ok: false, error: "Retiro inválido" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("release_reservation", { p_pickup_id: pickupId });
  if (error) return failure(error);
  revalidatePath("/comercio");
  revalidatePath("/reciclador");
  revalidatePath("/reciclador/retiros");
  sendDueNotifications();
  return { ok: true, data: undefined };
}

/** Cada parte califica a la otra una vez, cuando la entrega está confirmada. */
export async function ratePickup(input: RatePickupInput): Promise<ActionResult> {
  const parsed = ratePickupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("rate_pickup", {
    p_pickup_id: parsed.data.pickupId,
    p_stars: parsed.data.stars,
    p_comment: parsed.data.comment || null,
  });
  if (error) return failure(error);
  revalidatePath("/comercio");
  revalidatePath("/reciclador/retiros");
  return { ok: true, data: undefined };
}
