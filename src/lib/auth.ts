import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import type { UserRole } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/server";

export type SessionProfile = {
  id: string;
  role: UserRole;
  displayName: string;
  orgType: string;
  municipality: string;
};

export const ROLE_HOME: Record<UserRole, string> = {
  generador: "/comercio",
  valorizador: "/reciclador",
  municipalidad: "/alcaldia",
};

/** Perfil del usuario con sesión, o null. Se memoriza por request. */
export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, display_name, org_type, municipality")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  return {
    id: profile.id,
    role: profile.role,
    displayName: profile.display_name,
    orgType: profile.org_type,
    municipality: profile.municipality,
  };
});

/** Exige sesión con ese rol: sin sesión va a /entrar; con otro rol, a su propia área. */
export async function requireRole(role: UserRole): Promise<SessionProfile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/entrar");
  if (profile.role !== role) redirect(ROLE_HOME[profile.role]);
  return profile;
}
