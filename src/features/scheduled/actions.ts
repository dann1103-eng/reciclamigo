"use server";

import { revalidatePath } from "next/cache";

import { firstIssue, idSchema } from "@/features/lots/schemas";
import { failure, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";

import { saveScheduledSchema, type SaveScheduledInput } from "./schemas";

/**
 * Crea o edita un retiro programado (con `id` es edición; al guardar queda activo). Es parte del
 * Plan Trazabilidad: sin plan la base responde con `code: "requiere_plan"`.
 */
export async function saveScheduledPickup(input: SaveScheduledInput): Promise<ActionResult<{ id: string }>> {
  const parsed = saveScheduledSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const p = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_scheduled_pickup", {
    p_collector_id: p.collectorId,
    p_polymer_code: p.polymerCode,
    p_estimated_lb: p.estimatedLb,
    p_modality: p.modality,
    p_weekday: p.weekday,
    p_start_time: p.startTime,
    p_end_time: p.endTime,
    p_notes: p.notes ?? null,
    p_id: p.id ?? null,
  });
  if (error) return failure(error);

  revalidatePath("/comercio/programados");
  return { ok: true, data: { id: data } };
}

/** Pausa o reanuda un retiro programado (mientras está en pausa no se crean lotes). */
export async function setScheduledActive(id: string, active: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Retiro programado inválido" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_scheduled_active", { p_id: id, p_active: active });
  if (error) return failure(error);
  revalidatePath("/comercio/programados");
  return { ok: true, data: undefined };
}

/** Borra un retiro programado. Los lotes que ya creó siguen su curso. */
export async function deleteScheduledPickup(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Retiro programado inválido" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_scheduled_pickup", { p_id: id });
  if (error) return failure(error);
  revalidatePath("/comercio/programados");
  return { ok: true, data: undefined };
}
