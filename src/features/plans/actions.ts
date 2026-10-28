"use server";

import { revalidatePath } from "next/cache";

import { failure, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";

/**
 * El comercio avisa que quiere el Plan Trazabilidad. No hay pasarela de pago: el equipo lo ve primero
 * en /admin/planes y lo activa a mano.
 */
export async function requestPlan(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_plan");
  if (error) return failure(error);

  revalidatePath("/comercio/plan");
  revalidatePath("/admin");
  revalidatePath("/admin/planes");
  return { ok: true, data: undefined };
}
