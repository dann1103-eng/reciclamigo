import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { DEMO_ACCOUNTS, type DemoRole } from "./accounts";

type Client = SupabaseClient<Database>;

/**
 * Cierra la sesión SOLO de este navegador. signOut() sin scope es global y sacaría a
 * todos los que comparten la cuenta demo (quien presenta, previews, URL pública).
 */
export async function endSession(supabase: Client): Promise<void> {
  await supabase.auth.signOut({ scope: "local" });
}

export const isDemoRole = (value: unknown): value is DemoRole =>
  typeof value === "string" && Object.hasOwn(DEMO_ACCOUNTS, value);

/** Entra con la cuenta demo del rol. Devuelve el error en español en vez de lanzar. */
export async function demoSignIn(supabase: Client, role: unknown, password: string): Promise<{ error: string | null }> {
  if (!isDemoRole(role)) return { error: "Rol de demo desconocido." };
  const { error } = await supabase.auth.signInWithPassword({ email: DEMO_ACCOUNTS[role].email, password });
  if (error) return { error: "No se pudo entrar con la cuenta demo. Revisa la conexión e inténtalo de nuevo." };
  return { error: null };
}
