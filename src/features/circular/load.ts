import type { Database } from "@/types/database";

import { isCircularSlug } from "./url";

type Fn = Database["public"]["Functions"]["get_circular"];

/** Lo único que se publica de un comercio: nunca datos personales ni de los valorizadores. */
export type CircularData = {
  businessName: string;
  orgType: string;
  totalLb: number;
  co2Kg: number;
  deliveries: number;
  lastDeliveryAt: string;
};

/** Lo único que necesita del cliente Supabase (permite probarlo sin red). */
export type CircularRpc = {
  rpc(fn: "get_circular", args: Fn["Args"]): PromiseLike<{ data: Fn["Returns"] | null; error: { message: string } | null }>;
};

/**
 * Busca la insignia pública de un comercio. null = no existe, no tiene plan activo,
 * no tiene entregas confirmadas o el slug está mal escrito (la base devuelve cero filas).
 * Si la base falla (p. ej. Supabase en pausa) LANZA: una insignia real no puede aparecer
 * como "no encontrada" por una caída.
 */
export async function loadCircular(supabase: CircularRpc, slug: string): Promise<CircularData | null> {
  if (!isCircularSlug(slug)) return null;
  const { data, error } = await supabase.rpc("get_circular", { p_slug: slug });
  if (error) throw new Error("No se pudo cargar la insignia. Inténtalo de nuevo en unos minutos.");
  const row = data?.[0];
  if (!row) return null;
  return {
    businessName: row.business_name,
    orgType: row.org_type,
    totalLb: Number(row.total_lb),
    co2Kg: Number(row.co2_kg),
    deliveries: Number(row.deliveries),
    lastDeliveryAt: row.last_delivery_at,
  };
}
