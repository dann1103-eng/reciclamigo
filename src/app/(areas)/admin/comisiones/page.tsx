import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { PolymerChip } from "@/components/polymer/polymer-chip";
import { buttonVariants } from "@/components/ui/button";
import { AdminHeading } from "@/features/admin/components/admin-heading";
import { fieldClass } from "@/features/admin/components/styles";
import { CommissionStatusButton } from "@/features/commissions/components/commission-status-button";
import { formatPct } from "@/features/commissions/format";
import { currentMonth, monthLabel, parseMonth, recentMonths, shiftMonth } from "@/features/commissions/month";
import { loadCommissionMonth, type CommissionDetail } from "@/features/commissions/queries";
import { sumSummary } from "@/features/commissions/totals";
import { formatSvDate } from "@/features/plans/dates";
import { requireRole } from "@/lib/auth";
import { formatUSD } from "@/lib/domain/format";
import { formatLb } from "@/lib/domain/units";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Comisiones" };

const th = "px-3 py-2.5 font-semibold whitespace-nowrap";
const td = "px-3 py-2.5 align-middle";
const num = "tabular text-right";

function StatusPill({ status }: { status: "pendiente" | "cobrada" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
        status === "cobrada" ? "bg-brand-soft text-brand" : "bg-accent-warm-soft text-accent-warm-ink",
      )}
    >
      {status === "cobrada" ? "Cobrada" : "Pendiente"}
    </span>
  );
}

function DetailTable({ rows }: { rows: CommissionDetail[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
        <caption className="sr-only">Comisiones del comprador en el mes</caption>
        <thead>
          <tr className="border-b border-border bg-paper-2">
            <th scope="col" className={th}>Fecha</th>
            <th scope="col" className={th}>Plástico</th>
            <th scope="col" className={cn(th, "text-right")}>Peso</th>
            <th scope="col" className={cn(th, "text-right")}>Valor de la compra</th>
            <th scope="col" className={cn(th, "text-right")}>%</th>
            <th scope="col" className={cn(th, "text-right")}>Comisión</th>
            <th scope="col" className={th}>Estado</th>
            <th scope="col" className={th}>
              <span className="sr-only">Acción</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-b-0">
              <td className={cn(td, "tabular whitespace-nowrap")}>
                {formatSvDate(r.completedAt ?? r.createdAt)}
                {r.voucherCode ? (
                  <Link
                    href={`/comprobantes/${r.voucherCode}`}
                    className="block text-xs font-semibold text-brand underline underline-offset-4"
                  >
                    {r.voucherCode}
                  </Link>
                ) : null}
              </td>
              <td className={td}>{r.polymerCode ? <PolymerChip code={r.polymerCode} /> : "—"}</td>
              <td className={cn(td, num)}>{r.confirmedLb !== null ? formatLb(r.confirmedLb, 2) : "—"}</td>
              <td className={cn(td, num)}>{formatUSD(r.grossAmount)}</td>
              <td className={cn(td, num)}>{formatPct(r.pct)}</td>
              <td className={cn(td, num, "font-semibold")}>{formatUSD(r.amount)}</td>
              <td className={td}>
                <StatusPill status={r.status} />
                {r.paidAt ? <span className="tabular mt-0.5 block text-xs text-muted-foreground">{formatSvDate(r.paidAt)}</span> : null}
              </td>
              <td className={td}>
                <CommissionStatusButton commissionId={r.id} status={r.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminComisionesPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await requireRole("administrador");
  const { mes } = await searchParams;
  const now = new Date();
  const month = parseMonth(mes, now);
  const supabase = await createClient();
  const { summary, details, factsMissing } = await loadCommissionMonth(supabase, month);
  const totals = sumSummary(summary);

  const options = recentMonths(now, 24);
  if (!options.includes(month)) options.push(month); // un mes viejo escrito en la URL también se puede elegir
  const detailsByBuyer = (collectorId: string) => details.filter((d) => d.collectorId === collectorId);
  const prevHref = `/admin/comisiones?mes=${shiftMonth(month, -1)}`;
  const nextHref = `/admin/comisiones?mes=${shiftMonth(month, 1)}`;
  const isCurrent = month === currentMonth(now);

  return (
    <>
      <AdminHeading title="Comisiones">
        <p>
          Solo los compradores de volumen pagan comisión, sobre cada compra confirmada.{" "}
          <strong className="text-foreground">No hay cobro automático: aquí solo se registra.</strong> Cobra por fuera y marca la
          comisión como cobrada.
        </p>
      </AdminHeading>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1">
          <Link href={prevHref} className={buttonVariants({ variant: "outline", size: "lg", className: "h-11 px-3" })}>
            <ChevronLeft aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Mes anterior</span>
          </Link>
          <h2 className="px-3 text-xl font-bold first-letter:uppercase">
            {monthLabel(month)}
          </h2>
          <Link
            href={nextHref}
            aria-disabled={isCurrent}
            tabIndex={isCurrent ? -1 : undefined}
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: cn("h-11 px-3", isCurrent && "pointer-events-none opacity-50"),
            })}
          >
            <span className="sr-only sm:not-sr-only">Mes siguiente</span>
            <ChevronRight aria-hidden="true" />
          </Link>
        </div>

        {/* Sin JavaScript: el formulario manda ?mes=AAAA-MM por GET. */}
        <form method="get" className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="mes" className="text-sm font-semibold">
              Ir a otro mes
            </label>
            <select id="mes" name="mes" defaultValue={month} className={fieldClass}>
              {options.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={buttonVariants({ variant: "outline", size: "lg", className: "h-11 px-4" })}>
            Ver
          </button>
        </form>
      </div>

      {summary.length === 0 ? (
        <div className="rounded-xl border border-dashed border-input px-5 py-6">
          <p className="font-semibold">No hay comisiones en {monthLabel(month)}</p>
          <p className="text-sm text-muted-foreground">
            Aparecen cuando un comprador de volumen confirma una compra. Los recicladores de base no pagan comisión.
          </p>
        </div>
      ) : (
        <section aria-labelledby="resumen" className="flex flex-col gap-3">
          <h2 id="resumen" className="text-xl font-bold">
            Resumen por comprador
          </h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm sm:text-base">
              <caption className="sr-only">Comisiones de {monthLabel(month)} por comprador</caption>
              <thead>
                <tr className="border-b border-border bg-paper-2">
                  <th scope="col" className={th}>Comprador</th>
                  <th scope="col" className={cn(th, "text-right")}>Entregas</th>
                  <th scope="col" className={cn(th, "text-right")}>Valor de las compras</th>
                  <th scope="col" className={cn(th, "text-right")}>Comisión</th>
                  <th scope="col" className={cn(th, "text-right")}>Pendiente</th>
                  <th scope="col" className={cn(th, "text-right")}>Cobrada</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={row.collectorId} className="border-b border-border">
                    <th scope="row" className={cn(td, "font-semibold")}>{row.collectorName}</th>
                    <td className={cn(td, num)}>{row.deliveries}</td>
                    <td className={cn(td, num)}>{formatUSD(row.grossAmount)}</td>
                    <td className={cn(td, num)}>{formatUSD(row.commissionAmount)}</td>
                    <td className={cn(td, num, row.pendingAmount > 0 && "font-semibold text-accent-warm-ink")}>{formatUSD(row.pendingAmount)}</td>
                    <td className={cn(td, num)}>{formatUSD(row.paidAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-paper-2 font-bold">
                  <th scope="row" className={td}>Total del mes</th>
                  <td className={cn(td, num)}>{totals.deliveries}</td>
                  <td className={cn(td, num)}>{formatUSD(totals.grossAmount)}</td>
                  <td className={cn(td, num)}>{formatUSD(totals.commissionAmount)}</td>
                  <td className={cn(td, num)}>{formatUSD(totals.pendingAmount)}</td>
                  <td className={cn(td, num)}>{formatUSD(totals.paidAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {summary.length > 0 ? (
        <section aria-labelledby="detalle" className="flex flex-col gap-3">
          <h2 id="detalle" className="text-xl font-bold">
            Detalle por comprador
          </h2>
          {factsMissing ? (
            <p role="status" className="rounded-lg bg-accent-warm-soft px-3 py-2 text-sm font-medium text-accent-warm-ink">
              No se pudo leer el peso ni el comprobante de cada entrega. Los montos y estados sí son los de la base.
            </p>
          ) : null}
          <div className="flex flex-col gap-3">
            {summary.map((row, index) => {
              const rows = detailsByBuyer(row.collectorId);
              return (
                <details key={row.collectorId} open={index === 0} className="group rounded-xl border border-border bg-card">
                  <summary className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                    <span>{row.collectorName}</span>
                    <span className="tabular text-sm font-medium text-muted-foreground">
                      {row.deliveries} {row.deliveries === 1 ? "entrega" : "entregas"} · comisión {formatUSD(row.commissionAmount)}
                    </span>
                  </summary>
                  <div className="border-t border-border">
                    <DetailTable rows={rows} />
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
