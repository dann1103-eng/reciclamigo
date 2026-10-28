"use server";

import { revalidatePath } from "next/cache";

import { endOfSvDayIso } from "@/features/plans/dates";
import { firstIssue } from "@/features/lots/schemas";
import { failure, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";

import {
  redeemPointsSchema,
  saveSettingSchema,
  setGeneratorPlanSchema,
  setValorizadorTipoSchema,
  type RedeemPointsInput,
  type SaveSettingInput,
  type SetGeneratorPlanInput,
  type SetValorizadorTipoInput,
} from "./schemas";
import { inputToSettingValue } from "./settings-input";

// Toda escritura va por RPC y la base vuelve a exigir que quien llama sea administrador:
// aquí solo se valida la forma de lo que llega y se pasan los errores (ya en español) tal cual.

/** Activa o desactiva el Plan Trazabilidad de un comercio. Sin fecha, la base usa hoy + plan_duracion_dias. */
export async function setGeneratorPlan(input: SetGeneratorPlanInput): Promise<ActionResult> {
  const parsed = setGeneratorPlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { profileId, plan, expiresOn } = parsed.data;

  let expiresAt: string | null = null;
  if (plan === "trazabilidad" && expiresOn) {
    expiresAt = endOfSvDayIso(expiresOn);
    if (!expiresAt) return { ok: false, error: "Elige una fecha de vencimiento válida" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_generator_plan", {
    p_profile_id: profileId,
    p_plan: plan,
    p_expires_at: expiresAt,
  });
  if (error) return failure(error);

  revalidatePath("/admin");
  revalidatePath("/admin/planes");
  return { ok: true, data: undefined };
}

/** Cambia a un valorizador entre reciclador de base y comprador de volumen. */
export async function setValorizadorTipo(input: SetValorizadorTipoInput): Promise<ActionResult> {
  const parsed = setValorizadorTipoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_valorizador_tipo", {
    p_profile_id: parsed.data.profileId,
    p_tipo: parsed.data.tipo,
  });
  if (error) return failure(error);

  revalidatePath("/admin/valorizadores");
  revalidatePath("/admin/comisiones");
  return { ok: true, data: undefined };
}

/** Guarda un ajuste de app_settings. La base valida el tipo y el rango (mínimo y máximo). */
export async function saveSetting(input: SaveSettingInput): Promise<ActionResult> {
  const parsed = saveSettingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const value = inputToSettingValue(parsed.data.key, parsed.data.raw);
  if (!value.ok) return { ok: false, error: value.error };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_setting", { p_key: parsed.data.key, p_value: value.value });
  if (error) {
    // Dejar un precio o el contacto vacío manda JSON null; PostgREST lo entrega como NULL de SQL y
    // set_setting responde "Escribe un valor". Se explica para que no parezca un error del campo.
    if (value.value === null && error.message === "Escribe un valor") {
      return { ok: false, error: `${error.message}. La base no aceptó dejar este ajuste vacío: avisa al equipo técnico.` };
    }
    return failure(error);
  }

  revalidatePath("/admin/configuracion");
  return { ok: true, data: undefined };
}

/** Registra un canje manual de ReciclaPuntos (consume primero los que caducan antes). */
export async function redeemPoints(input: RedeemPointsInput): Promise<ActionResult> {
  const parsed = redeemPointsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_points", {
    p_profile_id: parsed.data.profileId,
    p_points: parsed.data.points,
    p_note: parsed.data.note ?? null,
  });
  if (error) return failure(error);

  revalidatePath("/admin/puntos");
  revalidatePath("/comercio/puntos");
  revalidatePath("/reciclador/puntos");
  return { ok: true, data: undefined };
}
