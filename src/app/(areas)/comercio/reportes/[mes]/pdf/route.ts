import type { NextRequest } from "next/server";

import { fileResponse, generatorOr401, jsonError } from "@/features/reports/http";
import { loadMonthlyReport } from "@/features/reports/load";
import { buildReportModel } from "@/features/reports/model";
import { isMonthKey, reportFilename } from "@/features/reports/months";
import { renderReportPdf } from "@/features/reports/pdf";
import { getSettings } from "@/lib/settings/load";
import { createClient } from "@/lib/supabase/server";

/** Reporte de trazabilidad del mes en PDF. Solo comercios con Plan Trazabilidad. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ mes: string }> }) {
  const { mes } = await params;
  if (!isMonthKey(mes)) {
    return jsonError(400, "El mes debe tener el formato AAAA-MM, por ejemplo 2026-10.");
  }

  const auth = await generatorOr401();
  if ("response" in auth) return auth.response;

  try {
    const supabase = await createClient();
    const report = await loadMonthlyReport(supabase, mes);
    if (!report.ok) {
      // Sin plan la base responde "requiere_plan": es una regla de negocio, no una caída.
      return jsonError(report.code === "requiere_plan" ? 403 : 500, report.error);
    }

    const settings = await getSettings();
    const model = buildReportModel({
      businessName: auth.profile.displayName,
      month: mes,
      rows: report.rows,
      co2Factor: settings.co2Factor,
      generatedAt: new Date(),
    });
    const pdf = await renderReportPdf(model);
    return fileResponse(pdf, "application/pdf", reportFilename(mes), pdf.byteLength);
  } catch (error) {
    console.error("No se pudo generar el reporte de trazabilidad", error);
    return jsonError(500, "No se pudo generar el reporte. Inténtalo de nuevo en unos minutos.");
  }
}
