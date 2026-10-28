import { redirect } from "next/navigation";

import { getSessionProfile, ROLE_HOME } from "@/lib/auth";

/** Entrada única de la app instalada y de los avisos: lleva a cada quien a su pantalla. */
export default async function InicioPage() {
  const profile = await getSessionProfile();
  redirect(profile ? ROLE_HOME[profile.role] : "/entrar");
}
