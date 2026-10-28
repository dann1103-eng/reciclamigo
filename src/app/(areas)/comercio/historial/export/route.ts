import { historyToCsv } from "@/features/reports/csv";
import { fileResponse, generatorOr401, jsonError } from "@/features/reports/http";
import { loadHistory } from "@/features/reports/load";
import { getPlanStatus } from "@/features/plans/load";
import { svDateInput } from "@/features/lots/sv-time";
import { createClient } from "@/lib/supabase/server";

/** Historial completo del comercio en CSV. Solo con Plan Trazabilidad. */
export async function GET() {
  const auth = await generatorOr401();
  if ("response" in auth) return auth.response;

  try {
    const plan = await getPlanStatus();
    if (!plan.active) {
      return jsonError(403, "Exportar el historial es parte del Plan Trazabilidad. Actívalo para descargarlo en CSV.");
    }

    const supabase = await createClient();
    const history = await loadHistory(supabase);
    if (!history.ok) return jsonError(500, history.error);

    const csv = historyToCsv(history.rows);
    return fileResponse(csv, "text/csv; charset=utf-8", `historial-reciclamigo-${svDateInput()}.csv`);
  } catch (error) {
    console.error("No se pudo exportar el historial", error);
    return jsonError(500, "No se pudo exportar el historial. Inténtalo de nuevo en unos minutos.");
  }
}
