"use server";

import { revalidatePath } from "next/cache";

import { setCommissionStatusSchema, type SetCommissionStatusInput } from "@/features/admin/schemas";
import { firstIssue } from "@/features/lots/schemas";
import { failure, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";

/**
 * Marca una comisión como cobrada o la devuelve a pendiente. No hay cobro automático:
 * el administrador cobra fuera de la app y aquí solo lo registra.
 */
export async function setCommissionStatus(input: SetCommissionStatusInput): Promise<ActionResult> {
  const parsed = setCommissionStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_commission_status", {
    p_commission_id: parsed.data.commissionId,
    p_status: parsed.data.status,
  });
  if (error) return failure(error);

  revalidatePath("/admin");
  revalidatePath("/admin/comisiones");
  revalidatePath("/reciclador/comisiones");
  return { ok: true, data: undefined };
}
