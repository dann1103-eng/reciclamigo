import type { Database } from "@/types/database";

export type { ActionResult } from "@/lib/action-result";

export type NearbyLot = Database["public"]["Functions"]["nearby_lots"]["Returns"][number];

/** Radio de búsqueda en metros. Los radios disponibles salen de la configuración (`radios_aviso_km`); ver radius.ts. */
export type RadiusM = number;
