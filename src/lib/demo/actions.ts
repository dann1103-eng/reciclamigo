"use server";

import { redirect } from "next/navigation";

import { ROLE_HOME } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { DEMO_ACCOUNTS, type DemoRole } from "./accounts";

const isDemoRole = (value: unknown): value is DemoRole =>
  typeof value === "string" && Object.hasOwn(DEMO_ACCOUNTS, value);

/** Cambia a la cuenta demo de ese rol (solo con NEXT_PUBLIC_DEMO_MODE=true). */
export async function switchDemoRole(role: DemoRole): Promise<void> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") throw new Error("El modo demo está desactivado");
  if (!isDemoRole(role)) throw new Error("Rol de demo desconocido");

  const supabase = await createClient();
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_ACCOUNTS[role].email,
    password: process.env.DEMO_PASSWORD ?? "",
  });
  if (error) throw new Error(`No se pudo entrar con la cuenta demo: ${error.message}`);
  redirect(DEMO_ACCOUNTS[role].home);
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
    await supabase.auth.signOut();
    return { error: "Tu cuenta todavía no tiene un perfil en Reciclamigo." };
  }
  redirect(ROLE_HOME[profile.role]);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}
