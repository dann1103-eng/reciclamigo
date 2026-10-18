"use client";

import { FileCheck2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PolymerChip } from "@/components/polymer/polymer-chip";
import { buttonVariants } from "@/components/ui/button";
import { formatKg, formatUSD } from "@/lib/domain/format";
import { co2eAvoidedKg } from "@/lib/domain/impact";
import { cn } from "@/lib/utils";

import { formatPickupWindow } from "../format-window";
import type { MyPickup } from "../pickups";

import { CompletePickupForm } from "./complete-pickup-form";
import { RatePickup } from "./rate-pickup";

function statusText(pickup: MyPickup): string {
  if (pickup.status === "reservado") {
    const window = formatPickupWindow(new Date(pickup.pickupFrom), new Date(pickup.pickupTo));
    return `${window}. Esperando que el comercio marque la entrega.`;
  }
  if (pickup.status === "entregado") return "El comercio marcó la entrega. Confirma los kg reales.";
  return pickup.totalAmount ? `${formatUSD(pickup.totalAmount)} registrados` : "Sin cobro";
}

export function PickupRow({ pickup, highlighted = false }: { pickup: MyPickup; highlighted?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const kg = pickup.confirmedKg ?? pickup.estimatedKg;

  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card px-4 py-4",
        highlighted ? "border-brand shadow-raised" : "border-border",
      )}
    >
      {highlighted && pickup.status === "completado" ? (
        <p role="status" className="tabular rounded-lg bg-brand-soft px-3 py-2 text-sm font-semibold text-brand">
          Retiro completado: {formatKg(kg)} fuera del vertedero y {formatKg(co2eAvoidedKg(kg))} de CO₂e evitados.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <PolymerChip code={pickup.polymerCode} />
            <span className="tabular font-bold">{formatKg(kg)}</span>
            <span className="text-sm text-muted-foreground">{pickup.generatorName}</span>
          </div>
          <p className="text-sm">{statusText(pickup)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pickup.status === "entregado" && !confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className={buttonVariants({ size: "lg", className: "h-11 px-4" })}
            >
              Confirmar retiro
            </button>
          ) : null}
          {pickup.status === "completado" && pickup.certificateCode ? (
            <Link
              href={`/certificados/${pickup.certificateCode}`}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold outline-none hover:bg-paper-2 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <FileCheck2 className="size-4" aria-hidden="true" />
              Ver certificado
            </Link>
          ) : null}
        </div>
      </div>

      {pickup.status === "completado" ? (
        <RatePickup pickupId={pickup.id} otherName={pickup.generatorName} myRating={pickup.myRating} />
      ) : null}

      {confirming && pickup.status === "entregado" ? (
        <CompletePickupForm pickup={pickup} onCancel={() => setConfirming(false)} />
      ) : null}
    </li>
  );
}
