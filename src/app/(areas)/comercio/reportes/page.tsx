import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { DownloadLink } from "@/features/reports/components/download-link";
import { currentMonthKey, lastMonths, monthLabel } from "@/features/reports/months";
import { getPlanStatus } from "@/features/plans/load";
import { requireRole } from "@/lib/auth";
import { formatUSD } from "@/lib/domain/format";
import { getSettings } from "@/lib/settings/load";

export const metadata: Metadata = { title: "Reportes" };

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Lo que trae el reporte, en el mismo orden en que aparece en el PDF.
const CONTENTS = [
  "Las libras que entregaste de cada tipo de plástico, con su equivalente en kg",
  "Cuántas entregas fueron",
  "El CO₂ que evitaste",
  "La lista de comprobantes: fecha, reciclador, peso confirmado y código",
];

export default async function ReportesPage() {
  await requireRole("generador");
  const [plan, settings] = await Promise.all([getPlanStatus(), getSettings()]);

  if (!plan.active) {
    return (
      <>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Reporte de trazabilidad</h1>
          <p className="max-w-prose text-muted-foreground">
            Un PDF por mes que documenta lo que recicla tu negocio. Vender tus lotes siempre es gratis: el reporte es para quien necesita
            dejar constancia de lo que recicla.
          </p>
        </div>
        <section className="flex max-w-2xl flex-col gap-4 rounded-xl border border-border bg-card px-5 py-5" aria-labelledby="que-trae">
          <h2 id="que-trae" className="text-lg font-bold">
            Qué trae cada reporte
          </h2>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            {CONTENTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Solo cuentan las entregas que el reciclador confirmó en la app. Lo que se queda en WhatsApp no entra.
          </p>
          <div className="flex flex-col items-start gap-2 rounded-lg bg-paper-2 px-4 py-3">
            <p className="tabular text-sm">
              Es parte del Plan Trazabilidad: <strong className="text-base">{formatUSD(settings.planPriceUsd)} al mes</strong>.
            </p>
            <Link href="/comercio/plan" className={buttonVariants({ size: "lg", className: "h-11 px-4" })}>
              Ver el Plan Trazabilidad
            </Link>
          </div>
        </section>
      </>
    );
  }

  const current = currentMonthKey();
  const months = lastMonths();

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Reporte de trazabilidad</h1>
        <p className="max-w-prose text-muted-foreground">
          Elige el mes y descarga el PDF: libras por tipo de plástico, entregas, CO₂ evitado y la lista de comprobantes. Solo cuentan las
          entregas confirmadas.
        </p>
      </div>
      <section aria-labelledby="meses" className="flex flex-col gap-3">
        <h2 id="meses" className="text-xl font-bold">
          Últimos {months.length} meses
        </h2>
        <ul className="flex flex-col gap-2">
          {months.map((month) => (
            <li
              key={month}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <FileText className="size-5 text-muted-foreground" aria-hidden="true" />
                <span className="font-semibold">{capitalize(monthLabel(month))}</span>
                {month === current ? (
                  <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand">Mes en curso</span>
                ) : null}
              </div>
              <DownloadLink href={`/comercio/reportes/${month}/pdf`}>
                Descargar PDF
                <span className="sr-only"> de {monthLabel(month)}</span>
              </DownloadLink>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
