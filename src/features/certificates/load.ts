import type { Database } from "@/types/database";

import { isCertificateCode } from "./url";

type Fn = Database["public"]["Functions"]["get_certificate"];
export type CertificateData = Fn["Returns"][number];

/** Lo único que necesita del cliente Supabase (permite probarlo sin red). */
export type CertificateRpc = {
  rpc(fn: "get_certificate", args: Fn["Args"]): PromiseLike<{ data: Fn["Returns"] | null; error: { message: string } | null }>;
};

/**
 * Busca un certificado por código. null = no existe o el código está mal escrito.
 * Si la base falla (p. ej. Supabase en pausa) LANZA: un certificado real no puede
 * aparecer como "no encontrado" por una caída.
 */
export async function loadCertificate(supabase: CertificateRpc, code: string): Promise<CertificateData | null> {
  if (!isCertificateCode(code)) return null;
  const { data, error } = await supabase.rpc("get_certificate", { p_code: code });
  if (error) throw new Error("No se pudo verificar el certificado. Inténtalo de nuevo en unos minutos.");
  return data?.[0] ?? null;
}
