import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { planPriceLabel } from "@/features/plans/comparison";
import { formatSvDate } from "@/features/plans/dates";
import { PlansComparison } from "@/features/plans/components/plans-comparison";
import { RequestPlanButton } from "@/features/plans/components/request-plan-button";
import { getPlanStatus } from "@/features/plans/load";
import { planActivationUrl } from "@/features/plans/whatsapp";
import { requireRole } from "@/lib/auth";
import { freeLotsLeft, limitReached } from "@/lib/domain/plans";
import { getSettings } from "@/lib/settings/load";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tu plan" };

export default async function ComercioPlanPage() {
  const profile = await requireRole("generador");
  const [status, settings] = await Promise.all([getPlanStatus(), getSettings()]);

  const left = freeLotsLeft(status);
  const atLimit = limitReached(status);
  const limit = status.freeLimit;
  const whatsappUrl = planActivationUrl(settings.contactWhatsapp, profile.displayName);
  const price = planPriceLabel(settings.planPriceUsd);

  const requestLabel = status.active ? "Pedir renovación" : status.requestedAt ? "Avisar de nuevo" : "Pedir activación";

  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{profile.displayName}</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Tu plan</h1>
      </div>

      <section aria-labelledby="estado" className="flex flex-col gap-5 rounded-xl border border-border bg-card px-5 py-5 shadow-raised">
        <div className="flex flex-col gap-2">
          <h2 id="estado" className="sr-only">
            Estado de tu plan
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-sm font-bold",
                status.active ? "bg-brand text-brand-foreground" : "bg-paper-2 text-foreground",
              )}
            >
              {status.active ? "Plan Trazabilidad" : "Plan gratis"}
            </span>
            {status.active ? (
              <span className="tabular text-lg font-semibold">
                {status.expiresAt ? `activo hasta el ${formatSvDate(status.expiresAt)}` : "activo"}
              </span>
            ) : null}
          </div>
          {!status.active && status.expiresAt ? (
            <p className="tabular text-sm text-muted-foreground">Tu Plan Trazabilidad terminó el {formatSvDate(status.expiresAt)}.</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2" aria-label="Uso del mes" role="group">
          {status.active ? (
            <>
              <p className="text-lg font-semibold">Lotes ilimitados</p>
              <p className="tabular text-sm text-muted-foreground">
                Este mes publicaste {status.publishedThisMonth} {status.publishedThisMonth === 1 ? "lote" : "lotes"}.
              </p>
            </>
          ) : limit !== null ? (
            <>
              <p className="tabular text-lg font-semibold">
                {status.publishedThisMonth} de {limit} lotes gratis este mes
              </p>
              <div
                role="meter"
                aria-label="Lotes gratis usados este mes"
                aria-valuemin={0}
                aria-valuemax={limit}
                aria-valuenow={Math.min(status.publishedThisMonth, limit)}
                className="h-2.5 w-full max-w-sm overflow-hidden rounded-full bg-paper-3"
              >
                <div
                  className={cn("h-full rounded-full", atLimit ? "bg-accent-warm-ink" : "bg-brand")}
                  style={{ width: `${limit > 0 ? Math.min(100, (status.publishedThisMonth / limit) * 100) : 100}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {atLimit
                  ? "Llegaste al límite del mes. Lo que ya publicaste y tus entregas siguen funcionando; el 1.º del próximo mes vuelves a empezar."
                  : `Te ${left === 1 ? "queda 1 lote gratis" : `quedan ${left} lotes gratis`} este mes. El conteo empieza de nuevo el 1.º de cada mes.`}
              </p>
            </>
          ) : (
            <p className="text-lg font-semibold">Plan gratis</p>
          )}
        </div>

        {status.requestedAt ? (
          <p className="tabular rounded-lg bg-brand-soft px-3 py-2 text-sm font-medium text-brand">
            Pediste {status.active ? "la renovación" : "la activación"} el {formatSvDate(status.requestedAt)}. El equipo de Reciclamigo
            te contacta para coordinarla.
          </p>
        ) : null}

        <div className="flex flex-col gap-3">
          <p className="max-w-prose text-sm text-muted-foreground">
            El Plan Trazabilidad cuesta <strong className="text-foreground">{price}</strong>. Por ahora el equipo de Reciclamigo lo
            activa a mano, después de coordinar el pago contigo; todavía no hay pago en línea.
          </p>
          <div className="flex flex-wrap items-start gap-3">
            <RequestPlanButton label={requestLabel} variant={status.active ? "outline" : "default"} />
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ size: "xl", variant: "outline" })}
              >
                <MessageCircle aria-hidden="true" />
                Escribir por WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <PlansComparison
        priceUsd={settings.planPriceUsd}
        freeLotsPerMonth={settings.freeLotsPerMonth}
        freeHistoryDays={settings.freeHistoryDays}
      />
    </>
  );
}
