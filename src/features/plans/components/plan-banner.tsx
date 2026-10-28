import Link from "next/link";

import { limitReached, freeLotsLeft, type PlanStatus } from "@/lib/domain/plans";
import { cn } from "@/lib/utils";

import { planPriceLabel } from "../comparison";
import { formatSvDate } from "../dates";

const linkClass =
  "inline-flex h-11 items-center rounded-md px-1 text-sm font-semibold underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Franja compacta de la pantalla del comercio: cuántos lotes gratis le quedan, o hasta cuándo tiene el
 * Plan Trazabilidad, con enlace a /comercio/plan. El color avisa: verde plan activo, ámbar límite alcanzado.
 */
export function PlanBanner({ status, priceUsd }: { status: PlanStatus; priceUsd: number }) {
  const left = freeLotsLeft(status);

  let text: string;
  let cta: string;
  let tone: "brand" | "warm" | "plain";

  if (status.active) {
    text = status.expiresAt ? `Plan Trazabilidad activo hasta ${formatSvDate(status.expiresAt)}` : "Plan Trazabilidad activo";
    cta = "Ver mi plan";
    tone = "brand";
  } else if (limitReached(status)) {
    text = `Llegaste al límite del mes: ya publicaste tus ${status.freeLimit} lotes gratis`;
    cta = `Ver el Plan Trazabilidad (${planPriceLabel(priceUsd)})`;
    tone = "warm";
  } else if (left !== null) {
    text = left === 1 ? "Te queda 1 lote gratis este mes" : `Te quedan ${left} lotes gratis este mes`;
    cta = "Ver mi plan";
    tone = "plain";
  } else {
    text = "Estás en el plan gratis";
    cta = "Ver mi plan";
    tone = "plain";
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border px-4 py-2 text-sm",
        tone === "brand" && "border-brand/30 bg-brand-soft text-brand",
        tone === "warm" && "border-accent-warm-ink/30 bg-accent-warm-soft text-accent-warm-ink",
        tone === "plain" && "border-border bg-paper-2 text-foreground",
      )}
    >
      <p className="font-medium">{text}</p>
      <Link href="/comercio/plan" className={cn(linkClass, tone === "plain" && "text-brand")}>
        {cta}
      </Link>
    </div>
  );
}
