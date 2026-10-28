import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { monthFirstDay, type MonthKey } from "@/features/commissions/month";
import { sumSummary, summaryFromRpc } from "@/features/commissions/totals";
import type { TipoValorizador, UserRole } from "@/lib/domain/types";
import type { Database, Json } from "@/types/database";

import { planState, type AdminPlanRow } from "./plan-list";

type Client = SupabaseClient<Database>;

// Una caída de la base lanza y la muestra error.tsx ("Reintentar"), no una pantalla vacía.
function fail(error: { message: string }): never {
  throw new Error(error.message);
}

/** Números de la pantalla de resumen. */
export type AdminOverview = {
  comercios: number;
  conPlanActivo: number;
  /** Comercios que pidieron la activación y todavía no la tienen atendida. */
  solicitudes: number;
  valorizadoresBase: number;
  valorizadoresVolumen: number;
  month: MonthKey;
  comisionesPendientes: number;
  comisionesDelMes: number;
  comisionesCompradores: number;
};

export async function loadOverview(supabase: Client, month: MonthKey, now: Date = new Date()): Promise<AdminOverview> {
  const [generadores, plans, valorizadores, summary] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "generador"),
    supabase.from("generator_plans").select("plan, started_at, expires_at, requested_at"),
    supabase.from("profiles").select("tipo_valorizador").eq("role", "valorizador"),
    supabase.rpc("commission_summary", { p_month: monthFirstDay(month) }),
  ]);
  if (generadores.error) fail(generadores.error);
  if (plans.error) fail(plans.error);
  if (valorizadores.error) fail(valorizadores.error);
  if (summary.error) fail(summary.error);

  const planRows = plans.data ?? [];
  const totals = sumSummary(summaryFromRpc(summary.data ?? []));
  const tipos = valorizadores.data ?? [];

  return {
    comercios: generadores.count ?? 0,
    conPlanActivo: planRows.filter(
      (p) => planState({ plan: p.plan, startedAt: p.started_at, expiresAt: p.expires_at }, now) === "activo",
    ).length,
    solicitudes: planRows.filter((p) => p.requested_at !== null).length,
    valorizadoresBase: tipos.filter((v) => v.tipo_valorizador === "base").length,
    valorizadoresVolumen: tipos.filter((v) => v.tipo_valorizador === "volumen").length,
    month,
    comisionesPendientes: totals.pendingAmount,
    comisionesDelMes: totals.commissionAmount,
    comisionesCompradores: summary.data?.length ?? 0,
  };
}

/** Todos los comercios con su plan; los que no tienen fila en generator_plans son gratis. */
export async function loadPlanRows(supabase: Client): Promise<AdminPlanRow[]> {
  const [profiles, plans] = await Promise.all([
    supabase.from("profiles").select("id, display_name, org_type, municipality").eq("role", "generador"),
    supabase.from("generator_plans").select("profile_id, plan, started_at, expires_at, requested_at"),
  ]);
  if (profiles.error) fail(profiles.error);
  if (plans.error) fail(plans.error);

  const planById = new Map((plans.data ?? []).map((p) => [p.profile_id, p]));
  return (profiles.data ?? []).map((p) => {
    const plan = planById.get(p.id);
    return {
      profileId: p.id,
      name: p.display_name,
      orgType: p.org_type,
      municipality: p.municipality,
      plan: plan?.plan ?? null,
      startedAt: plan?.started_at ?? null,
      expiresAt: plan?.expires_at ?? null,
      requestedAt: plan?.requested_at ?? null,
    };
  });
}

export type AdminValorizador = {
  id: string;
  name: string;
  orgType: string;
  municipality: string;
  verified: boolean;
  tipo: TipoValorizador;
};

export async function loadValorizadores(supabase: Client): Promise<AdminValorizador[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, org_type, municipality, verified, tipo_valorizador")
    .eq("role", "valorizador")
    .order("display_name");
  if (error) fail(error);

  return (data ?? []).map((v) => ({
    id: v.id,
    name: v.display_name,
    orgType: v.org_type,
    municipality: v.municipality,
    verified: v.verified,
    // La base garantiza tipo_valorizador en todo valorizador (check de profiles).
    tipo: v.tipo_valorizador ?? "base",
  }));
}

export type SettingRow = {
  key: string;
  value: Json;
  description: string;
  minValue: number | null;
  maxValue: number | null;
};

export async function loadSettingRows(supabase: Client): Promise<SettingRow[]> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value, description, min_value, max_value")
    .order("key");
  if (error) fail(error);

  return (data ?? []).map((r) => ({
    key: r.key,
    value: r.value,
    description: r.description,
    minValue: r.min_value === null ? null : Number(r.min_value),
    maxValue: r.max_value === null ? null : Number(r.max_value),
  }));
}

export type PointsPerson = { id: string; name: string; role: UserRole; orgType: string; municipality: string };

/** Comercios y recicladores: a quienes se les puede registrar un canje. */
export async function loadPointsPeople(supabase: Client): Promise<PointsPerson[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role, org_type, municipality")
    .in("role", ["generador", "valorizador"])
    .order("display_name");
  if (error) fail(error);
  return (data ?? []).map((p) => ({ id: p.id, name: p.display_name, role: p.role, orgType: p.org_type, municipality: p.municipality }));
}

export type LedgerEntry = {
  id: string;
  kind: "ganado" | "canje" | "ajuste";
  points: number;
  remaining: number | null;
  expiresAt: string | null;
  note: string | null;
  createdAt: string;
};

export const LEDGER_LIMIT = 100;

/** Saldo vigente (sin caducados ni canjeados) y los últimos movimientos de una persona. */
export async function loadPointsDetail(supabase: Client, profileId: string): Promise<{ balance: number; ledger: LedgerEntry[] }> {
  const [balance, ledger] = await Promise.all([
    supabase.rpc("points_balance", { p_profile: profileId }),
    supabase
      .from("points_ledger")
      .select("id, kind, points, remaining, expires_at, note, created_at")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(LEDGER_LIMIT),
  ]);
  if (balance.error) fail(balance.error);
  if (ledger.error) fail(ledger.error);

  return {
    balance: Number(balance.data ?? 0),
    ledger: (ledger.data ?? []).map((l) => ({
      id: l.id,
      kind: l.kind,
      points: l.points,
      remaining: l.remaining,
      expiresAt: l.expires_at,
      note: l.note,
      createdAt: l.created_at,
    })),
  };
}
