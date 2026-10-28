"use client";

import { FileCheck2 } from "lucide-react";
import Link from "next/link";

import { PolymerChip } from "@/components/polymer/polymer-chip";
import { formatUSD } from "@/lib/domain/format";
import { co2AvoidedKg, formatCo2, formatLb } from "@/lib/domain/units";
import { cn } from "@/lib/utils";

import { formatPickupWindow } from "../format-window";
import type { MyPickup } from "../pickups";
import { reservationMessage } from "../whatsapp";

import { ConfirmDeliveryForm } from "./confirm-delivery-form";
import { RatePickup } from "./rate-pickup";
import { ReleaseButton } from "./release-button";
import { WhatsAppButton } from "./whatsapp-button";

function statusText(pickup: MyPickup): string {
  if (pickup.status === "reservado") {
    const window = formatPickupWindow(new Date(pickup.pickupFrom), new Date(pickup.pickupTo));
    return `${window}. Esperando que el comercio registre la entrega.`;
  }
  if (pickup.status === "entregado") return "El comercio registró la entrega. Acéptala o corrígela.";
  return pickup.totalAmount ? `${formatUSD(pickup.totalAmount)} registrados` : "Sin cobro";
}

export function PickupRow({
  pickup,
  collectorName,
  co2Factor,
  highlighted = false,
}: {
  pickup: MyPickup;
  collectorName: string;
  co2Factor: number;
  highlighted?: boolean;
}) {
  const lb = pickup.confirmedLb ?? pickup.proposedLb ?? pickup.estimatedLb;

  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card px-4 py-4",
        highlighted ? "border-brand shadow-raised" : "border-border",
      )}
    >
      {highlighted && pickup.status === "completado" ? (
        <p role="status" className="tabular rounded-lg bg-brand-soft px-3 py-2 text-sm font-semibold text-brand">
          Entrega confirmada: {formatLb(lb, 2)} fuera del vertedero y {formatCo2(co2AvoidedKg(lb, co2Factor))} de CO₂ evitado.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <PolymerChip code={pickup.polymerCode} />
            <span className="tabular font-bold">{formatLb(lb, pickup.status === "completado" ? 2 : 1)}</span>
            <span className="text-sm text-muted-foreground">{pickup.generatorName}</span>
          </div>
          <p className="text-sm">{statusText(pickup)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pickup.status !== "completado" ? (
            <WhatsAppButton
              phone={pickup.generatorWhatsapp}
              text={reservationMessage({
                collectorName,
                lotId: pickup.lotId,
                polymerCode: pickup.polymerCode,
                estimatedLb: pickup.estimatedLb,
                windowLabel: formatPickupWindow(new Date(pickup.pickupFrom), new Date(pickup.pickupTo)),
              })}
            />
          ) : null}
          {pickup.status === "completado" && pickup.voucherCode ? (
            <Link
              href={`/comprobantes/${pickup.voucherCode}`}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold outline-none hover:bg-paper-2 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <FileCheck2 className="size-4" aria-hidden="true" />
              Ver comprobante
            </Link>
          ) : null}
        </div>
      </div>

      {pickup.status === "reservado" ? <ReleaseButton pickupId={pickup.id} by="reciclador" /> : null}

      {pickup.status === "completado" ? (
        <RatePickup pickupId={pickup.id} otherName={pickup.generatorName} myRating={pickup.myRating} />
      ) : null}

      {pickup.status === "entregado" ? <ConfirmDeliveryForm pickup={pickup} /> : null}
    </li>
  );
}
