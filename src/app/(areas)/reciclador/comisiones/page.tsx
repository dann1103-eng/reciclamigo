import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { groupByMonth } from "@/features/commissions/by-month";
import { formatPct } from "@/features/commissions/format";
import { monthLabel } from "@/features/commissions/month";
import { loadMyCommissions } from "@/features/commissions/queries";
import { formatSvDate } from "@/features/plans/dates";
import { requireRole } from "@/lib/auth";
import { formatUSD } from "@/lib/domain/format";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings/load";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Comisiones" };

const th = "px-3 py-2.5 font-semibold whitespace-nowrap";
const td = "px-3 py-2.5 align-middle";

export default async function RecicladorComisionesPage() {
  const profile = await requireRole("valorizador");
  // Solo los compradores de volumen pagan comisión.
  if (profile.tipoValorizador !== "volumen") redirect("/reciclador");

  const supabase = await createClient();
  const [commissions, settings] = await Promise.all([loadMyCommissions(supabase, profile.id), getSettings()]);
  const months = groupByMonth(commissions);

  return (
    <>
      <div className="flex flex-col gap-2">
        <Link
          href="/reciclador"
          className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Lotes cerca
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight">Mis comisiones</h1>
        <div className="flex max-w-prose flex-col gap-1.5 leading-relaxed text-muted-foreground">
          <p>
            <strong className="text-foreground">
              Pagas {formatPct(settings.commissionPct)} solo sobre compras confirmadas; los recicladores de base pagan 0 %.
            </strong>
          </p>
          <p>
            Por ahora la comisión solo se registra: no hay cobro automático. El equipo de Reciclamigo coordina contigo el cobro y
            marca cada comisión como cobrada.
          </p>
        </div>
      </div>

      {months.length === 0 ? (
        <div className="flex flex-col gap-1 rounded-xl border border-dashed border-input px-5 py-6">
          <p className="font-semibold">Todavía no tienes comisiones</p>
          <p className="text-sm text-muted-foreground">
            Aparecen cuando confirmas la compra de un lote con precio. Los lotes de trueque o donación no generan comisión.
          </p>
        </div>
      ) : (
        months.map((group) => (
          <section key={group.month} aria-labelledby={`mes-${group.month}`} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id={`mes-${group.month}`} className="text-xl font-bold first-letter:uppercase">
                {monthLabel(group.month)}
              </h2>
              <p className="tabular text-sm text-muted-foreground">
                Comisión {formatUSD(group.amount)} · pendiente {formatUSD(group.pendingAmount)} · cobrada {formatUSD(group.paidAmount)}
              </p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[32rem] border-collapse text-left text-sm sm:text-base">
                <caption className="sr-only">Comisiones de {monthLabel(group.month)}</caption>
                <thead>
                  <tr className="border-b border-border bg-paper-2">
                    <th scope="col" className={th}>Fecha</th>
                    <th scope="col" className={cn(th, "text-right")}>Valor de la compra</th>
                    <th scope="col" className={cn(th, "text-right")}>% aplicado</th>
                    <th scope="col" className={cn(th, "text-right")}>Comisión</th>
                    <th scope="col" className={th}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-b-0">
                      <td className={cn(td, "tabular whitespace-nowrap")}>{formatSvDate(r.createdAt)}</td>
                      <td className={cn(td, "tabular text-right")}>{formatUSD(r.grossAmount)}</td>
                      <td className={cn(td, "tabular text-right")}>{formatPct(r.pct)}</td>
                      <td className={cn(td, "tabular text-right font-semibold")}>{formatUSD(r.amount)}</td>
                      <td className={td}>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            r.status === "cobrada" ? "bg-brand-soft text-brand" : "bg-accent-warm-soft text-accent-warm-ink",
                          )}
                        >
                          {r.status === "cobrada" ? "Cobrada" : "Pendiente"}
                        </span>
                        {r.paidAt ? <span className="tabular mt-0.5 block text-xs text-muted-foreground">{formatSvDate(r.paidAt)}</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </>
  );
}
