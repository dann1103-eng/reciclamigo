import type { Database } from "@/types/database";

import { isVoucherCode } from "./url";

type Fn = Database["public"]["Functions"]["get_voucher"];
export type VoucherData = Fn["Returns"][number];

/** Lo único que necesita del cliente Supabase (permite probarlo sin red). */
export type VoucherRpc = {
  rpc(fn: "get_voucher", args: Fn["Args"]): PromiseLike<{ data: Fn["Returns"] | null; error: { message: string } | null }>;
};

/**
 * Busca un comprobante por código. null = no existe o el código está mal escrito.
 * Si la base falla (p. ej. Supabase en pausa) LANZA: un comprobante real no puede
 * aparecer como "no encontrado" por una caída.
 */
export async function loadVoucher(supabase: VoucherRpc, code: string): Promise<VoucherData | null> {
  if (!isVoucherCode(code)) return null;
  const { data, error } = await supabase.rpc("get_voucher", { p_code: code });
  if (error) throw new Error("No se pudo verificar el comprobante. Inténtalo de nuevo en unos minutos.");
  return data?.[0] ?? null;
}
