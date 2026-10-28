import type { Metadata } from "next";
import Link from "next/link";
import { Clock } from "lucide-react";

import { AdminHeading } from "@/features/admin/components/admin-heading";
import { PlanActions } from "@/features/admin/components/plan-actions";
import { planState, sortPlanRows, type AdminPlanRow, type PlanState } from "@/features/admin/plan-list";
import { loadPlanRows } from "@/features/admin/queries";
import { planPriceLabel } from "@/features/plans/comparison";
import { addDaysToDate, formatSvDate, svToday } from "@/features/plans/dates";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings/load";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Planes" };

const STATE_STYLE: Record<PlanState, string> = {
  activo: "bg-brand-soft text-brand",
  vencido: "bg-accent-warm-soft text-accent-warm-ink",
  gratis: "bg-paper-2 text-muted-foreground",
};

function stateText(row: AdminPlanRow, state: PlanState): string {
  if (state === "activo") return row.expiresAt ? `Plan Trazabilidad activo hasta ${formatSvDate(row.expiresAt)}` : "Plan Trazabilidad activo";
  if (state === "vencido") return `Plan Trazabilidad vencido el ${formatSvDate(row.expiresAt as string)}`;
  return "Plan gratis";
}

function PlanItem({ row, now, defaultExpiresOn, today }: { row: AdminPlanRow; now: Date; defaultExpiresOn: string; today: string }) {
  const state = planState(row, now);
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold">{row.name}</h3>
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATE_STYLE[state])}>{stateText(row, state)}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {row.orgType} · {row.municipality}
        </p>
        {row.requestedAt ? (
          <p className="inline-flex w-fit items-center gap-1.5 rounded-md bg-accent-warm-soft px-2.5 py-1 text-sm font-semibold text-accent-warm-ink">
            <Clock className="size-4" aria-hidden="true" />
            {state === "activo" ? "Pidió renovar el plan" : "Pidió la activación"} el {formatSvDate(row.requestedAt)}
          </p>
        ) : null}
      </div>
      <PlanActions profileId={row.profileId} name={row.name} state={state} defaultExpiresOn={defaultExpiresOn} minExpiresOn={today} />
    </li>
  );
}

export default async function AdminPlanesPage() {
  await requireRole("administrador");
  const supabase = await createClient();
  const [rows, settings] = await Promise.all([loadPlanRows(supabase), getSettings()]);

  const now = new Date();
  const today = svToday(now);
  const defaultExpiresOn = addDaysToDate(today, settings.planDurationDays);
  const sorted = sortPlanRows(rows, now);
  const requested = sorted.filter((r) => r.requestedAt);
  const rest = sorted.filter((r) => !r.requestedAt);

  return (
    <>
      <AdminHeading title="Planes de los comercios">
        <p>
          El Plan Trazabilidad cuesta <strong className="text-foreground">{planPriceLabel(settings.planPriceUsd)}</strong> y cada
          activación dura {settings.planDurationDays} días; puedes elegir otra fecha. No hay pasarela de pago: activa el plan cuando
          el comercio ya te pagó. El precio y la duración se cambian en{" "}
          <Link href="/admin/configuracion" className="font-semibold text-brand underline underline-offset-4">
            Configuración
          </Link>
          .
        </p>
      </AdminHeading>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-input px-5 py-6">
          <p className="font-semibold">Todavía no hay comercios registrados</p>
          <p className="text-sm text-muted-foreground">Cuando un comercio cree su cuenta, aparecerá aquí con su plan.</p>
        </div>
      ) : null}

      {requested.length > 0 ? (
        <section aria-labelledby="pidieron" className="flex flex-col gap-3">
          <h2 id="pidieron" className="text-xl font-bold">
            Pidieron activación ({requested.length})
          </h2>
          <ul className="flex flex-col gap-3">
            {requested.map((row) => (
              <PlanItem key={row.profileId} row={row} now={now} defaultExpiresOn={defaultExpiresOn} today={today} />
            ))}
          </ul>
        </section>
      ) : null}

      {rest.length > 0 ? (
        <section aria-labelledby="comercios" className="flex flex-col gap-3">
          <h2 id="comercios" className="text-xl font-bold">
            {requested.length > 0 ? "Los demás comercios" : "Comercios"} ({rest.length})
          </h2>
          <ul className="flex flex-col gap-3">
            {rest.map((row) => (
              <PlanItem key={row.profileId} row={row} now={now} defaultExpiresOn={defaultExpiresOn} today={today} />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
