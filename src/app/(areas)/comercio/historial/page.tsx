import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileText, Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { DownloadLink } from "@/features/reports/components/download-link";
import { HistoryList } from "@/features/reports/components/history-list";
import { loadHistory } from "@/features/reports/load";
import { currentMonthKey } from "@/features/reports/months";
import { getPlanStatus } from "@/features/plans/load";
import { requireRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings/load";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Historial" };

// Una pantalla cargada de lotes es lenta en un teléfono barato: el resto se descarga en el CSV.
const PAGE_LIMIT = 200;

export default async function HistorialPage() {
  await requireRole("generador");
  const supabase = await createClient();
  const [plan, settings, history] = await Promise.all([getPlanStatus(), getSettings(), loadHistory(supabase)]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Historial</h1>
          <p className="max-w-prose text-muted-foreground">
            Todos los lotes que publicaste, lo que se confirmó de cada uno y su comprobante.
          </p>
        </div>
        {plan.active ? (
          <div className="flex flex-wrap gap-2">
            <DownloadLink href="/comercio/historial/export">
              <Download aria-hidden="true" />
              Exportar CSV
            </DownloadLink>
            <DownloadLink href={`/comercio/reportes/${currentMonthKey()}/pdf`}>
              <FileText aria-hidden="true" />
              Exportar PDF
            </DownloadLink>
          </div>
        ) : null}
      </div>

      {plan.active ? null : (
        <div className="flex flex-col gap-2 rounded-xl bg-accent-warm-soft px-4 py-3 text-accent-warm-ink sm:flex-row sm:items-center sm:justify-between">
          <p className="tabular text-sm font-semibold">Ves los últimos {settings.freeHistoryDays} días.</p>
          <Link
            href="/comercio/plan"
            className="text-sm font-semibold underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Con el Plan Trazabilidad ves todo y lo exportas en CSV y PDF
          </Link>
        </div>
      )}

      {!history.ok ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {history.error}
        </p>
      ) : history.rows.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-input px-5 py-6">
          <p className="font-semibold">{plan.active ? "Todavía no publicas lotes" : `No publicaste lotes en los últimos ${settings.freeHistoryDays} días`}</p>
          <p className="text-sm text-muted-foreground">
            Cuando publiques un lote, aquí queda anotado lo que pasó con él, hasta su comprobante.
          </p>
          <Link href="/comercio/publicar" className={buttonVariants({ size: "lg", className: "h-11 px-4" })}>
            <Plus aria-hidden="true" />
            Publicar un lote
          </Link>
        </div>
      ) : (
        <section className="flex flex-col gap-3" aria-label="Lotes">
          <HistoryList rows={history.rows.slice(0, PAGE_LIMIT)} />
          {history.rows.length > PAGE_LIMIT ? (
            <p className="text-sm text-muted-foreground">
              Se muestran los {PAGE_LIMIT} lotes más recientes de {history.rows.length}.{" "}
              {plan.active ? "El CSV trae todos." : null}
            </p>
          ) : null}
        </section>
      )}
    </>
  );
}
