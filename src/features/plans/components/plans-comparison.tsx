import { cn } from "@/lib/utils";

import { planComparisonRows, planPriceLabel } from "../comparison";

/**
 * Gratis contra Plan Trazabilidad, con los dos mensajes que van siempre juntos: vender es gratis y el plan
 * es para quien necesita documentar lo que recicla. La usan /planes (pública) y /comercio/plan.
 */
export function PlansComparison({
  priceUsd,
  freeLotsPerMonth,
  freeHistoryDays,
}: {
  priceUsd: number;
  freeLotsPerMonth: number;
  freeHistoryDays: number;
}) {
  const rows = planComparisonRows({ freeLotsPerMonth, freeHistoryDays });

  return (
    <section aria-labelledby="comparacion-planes" className="flex flex-col gap-5">
      <div className="flex max-w-prose flex-col gap-2">
        <h2 id="comparacion-planes" className="text-2xl font-bold tracking-tight">
          Vender siempre es gratis
        </h2>
        <p className="text-lg leading-relaxed">
          No pagas comisión por vender y puedes publicar hasta {freeLotsPerMonth} lotes al mes sin pagar nada.
        </p>
        <p className="leading-relaxed text-muted-foreground">
          El Plan Trazabilidad es para quien necesita documentar lo que recicla: historial completo, reporte mensual y una
          insignia con QR.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[20rem] border-collapse text-left text-sm sm:text-base">
          <caption className="sr-only">Lo que incluye el plan gratis y el Plan Trazabilidad</caption>
          <thead>
            <tr className="border-b border-border bg-paper-2">
              <th scope="col" className="w-[44%] px-3 py-3 font-semibold sm:px-4">
                Función
              </th>
              <th scope="col" className="px-3 py-3 font-semibold sm:px-4">
                Gratis
              </th>
              <th scope="col" className="bg-brand-soft px-3 py-3 font-semibold text-brand sm:px-4">
                Plan Trazabilidad
                <span className="tabular block text-sm font-bold">{planPriceLabel(priceUsd)}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.feature} className="border-b border-border last:border-b-0">
                <th scope="row" className="px-3 py-3 font-medium sm:px-4">
                  {row.feature}
                </th>
                <td className={cn("px-3 py-3 sm:px-4", row.free === "No" && "text-muted-foreground")}>{row.free}</td>
                <td className="bg-brand-soft/40 px-3 py-3 font-semibold sm:px-4">{row.paid}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
