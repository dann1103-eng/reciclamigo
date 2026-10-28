import "server-only";

import { cache } from "react";

import { parseSettings, type AppSettings } from "@/lib/domain/settings";
import { createClient } from "@/lib/supabase/server";

/**
 * Configuración del negocio (tabla app_settings), memorizada por request. La lectura es
 * pública, así que sirve con o sin sesión. Los componentes de cliente la reciben por props.
 */
export const getSettings = cache(async (): Promise<AppSettings> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("app_settings").select("key, value");
  if (error) throw new Error(`No se pudo leer la configuración: ${error.message}`);
  return parseSettings(data ?? []);
});
