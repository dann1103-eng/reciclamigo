"use server";

import { redirect } from "next/navigation";

import { ROLE_HOME } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { DEMO_ACCOUNTS, type DemoRole } from "./accounts";
import { demoSignIn, endSession, isDemoRole } from "./session";

export type DemoSwitchState = { error: string | null; home?: string };

/**
 * Cambia a la cuenta demo de ese rol (solo con NEXT_PUBLIC_DEMO_MODE=true).
 * No redirige ni lanza: devuelve el destino o el error y el cliente decide, para que
 * una falla (red, Supabase en pausa) nunca tumbe la página durante el demo.
 */
export async function switchDemoRole(role: DemoRole): Promise<DemoSwitchState> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return { error: "El modo demo está desactivado." };
  if (!isDemoRole(role)) return { error: "Rol de demo desconocido." };

  const supabase = await createClient();
  // Entrar con la otra cuenta reemplaza la sesión de este navegador; si falla, se queda la actual.
  const result = await demoSignIn(supabase, role, process.env.DEMO_PASSWORD ?? "");
  if (result.error) return result;
  return { error: null, home: DEMO_ACCOUNTS[role].home };
}

export type SignInState = { error: string | null };

/** Inicio de sesión con correo y contraseña (para useActionState). */
export async function signInWithEmail(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Escribe tu correo y tu contraseña." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "Correo o contraseña incorrectos." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (!profile) {
    await endSession(supabase);
    return { error: "Tu cuenta todavía no tiene un perfil en Reciclamigo." };
  }
  redirect(ROLE_HOME[profile.role]);
}

/** Sale solo en este navegador (las cuentas demo se comparten). */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await endSession(supabase);
  redirect("/entrar");
}
