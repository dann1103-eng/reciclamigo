"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";
import { formatPricePerLb, formatUSD } from "@/lib/domain/format";
import { suggestedTotal } from "@/lib/domain/pricing";
import type { PaymentMethod } from "@/lib/domain/types";
import { formatLb } from "@/lib/domain/units";
import { cn } from "@/lib/utils";

import { completePickup } from "../actions";
import type { MyPickup } from "../pickups";
import { completePickupSchema, firstIssue, parseLb } from "../schemas";

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  efectivo: "Efectivo con comprobante",
  transferencia: "Transferencia",
  chivo_wallet: "Chivo Wallet",
};

const fieldClass =
  "tabular h-12 w-36 rounded-lg border border-input bg-card px-3 text-lg font-semibold outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40";

/**
 * Confirmación del reciclador, en un paso: acepta lo que registró el comercio o lo corrige.
 * Solo al confirmar cuenta la entrega (comprobante, puntos, reputación y, si aplica, comisión).
 */
export function ConfirmDeliveryForm({ pickup }: { pickup: MyPickup }) {
  const router = useRouter();
  const proposedLb = pickup.proposedLb ?? pickup.estimatedLb;
  const proposedPrice = pickup.proposedPricePerLb ?? pickup.pricePerLb;
  const isSale = pickup.modality === "venta";

  const [correcting, setCorrecting] = useState(false);
  const [lbRaw, setLbRaw] = useState(String(proposedLb));
  const [priceRaw, setPriceRaw] = useState(String(proposedPrice));
  const [payment, setPayment] = useState<PaymentMethod>("efectivo");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const lb = parseLb(lbRaw);
  const price = isSale ? parseLb(priceRaw) : 0;
  const proposedTotal = suggestedTotal(proposedLb, proposedPrice, pickup.modality);
  const correctedTotal = lb !== null && price !== null ? suggestedTotal(lb, price, pickup.modality) : 0;

  function submit(accept: boolean) {
    setError(null);
    if (!accept && lb === null) return setError("Escribe las libras reales, por ejemplo 95 o 95,5");
    if (!accept && isSale && price === null) return setError("Escribe el precio por libra, por ejemplo 0,09");
    const input = accept
      ? { pickupId: pickup.id, accept: true, paymentMethod: payment }
      : {
          pickupId: pickup.id,
          accept: false,
          confirmedLb: lb ?? undefined,
          ...(isSale && price !== null ? { finalPricePerLb: price } : {}),
          paymentMethod: payment,
        };
    const check = completePickupSchema.safeParse(input);
    if (!check.success) return setError(firstIssue(check.error));

    startTransition(async () => {
      try {
        const result = await completePickup(check.data);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        toast.success("Entrega confirmada", { description: `Comprobante ${result.data.voucherCode}` });
        router.push(`/reciclador/retiros?completado=${pickup.id}`);
        router.refresh();
      } catch {
        setError("No se pudo confirmar la entrega. Revisa la conexión e inténtalo de nuevo.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-paper-2 p-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold">{pickup.generatorName} registró esta entrega:</p>
        <p className="tabular text-lg font-bold">
          {formatLb(proposedLb, 2)}
          {isSale ? (
            <span className="font-medium text-muted-foreground">
              {" "}
              a {formatPricePerLb(proposedPrice)} = {formatUSD(proposedTotal)}
            </span>
          ) : null}
        </p>
        <p className="text-sm text-muted-foreground">Si coincide con lo que pesaste, acéptala. Si no, corrígela.</p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">¿Cómo se pagó?</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((method) => (
            <label
              key={method}
              className={cn(
                "flex h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors duration-200 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                payment === method ? "border-brand bg-card text-foreground" : "border-border bg-card/60 text-muted-foreground",
              )}
            >
              <input
                type="radio"
                name={`pago-${pickup.id}`}
                value={method}
                checked={payment === method}
                onChange={() => setPayment(method)}
                className="accent-[var(--brand)]"
              />
              {PAYMENT_LABEL[method]}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Se registra, no se procesa el pago.</p>
      </fieldset>

      {correcting ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Libras reales pesadas
              <span className="flex items-center gap-2">
                <input
                  inputMode="decimal"
                  autoComplete="off"
                  value={lbRaw}
                  onChange={(e) => setLbRaw(e.target.value)}
                  aria-invalid={lb === null}
                  className={fieldClass}
                />
                <span className="text-muted-foreground">lb</span>
              </span>
            </label>
            {isSale ? (
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                Precio por libra
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <input
                    inputMode="decimal"
                    autoComplete="off"
                    value={priceRaw}
                    onChange={(e) => setPriceRaw(e.target.value)}
                    aria-invalid={price === null}
                    className={fieldClass}
                  />
                </span>
              </label>
            ) : null}
          </div>
          {isSale ? (
            <p className="tabular text-sm">
              Total corregido: <strong className="text-base">{formatUSD(correctedTotal)}</strong>
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {correcting ? (
          <>
            <button type="button" onClick={() => submit(false)} disabled={pending} className={buttonVariants({ size: "lg", className: "h-11 px-4" })}>
              {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
              {pending ? "Confirmando…" : "Confirmar con mis datos"}
            </button>
            <button
              type="button"
              onClick={() => setCorrecting(false)}
              disabled={pending}
              className={buttonVariants({ size: "lg", variant: "ghost", className: "h-11 px-4" })}
            >
              Volver
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => submit(true)} disabled={pending} className={buttonVariants({ size: "lg", className: "h-11 px-4" })}>
              {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
              {pending ? "Confirmando…" : `Aceptar ${formatLb(proposedLb, 2)}`}
            </button>
            <button
              type="button"
              onClick={() => setCorrecting(true)}
              disabled={pending}
              className={buttonVariants({ size: "lg", variant: "outline", className: "h-11 px-4" })}
            >
              Corregir
            </button>
          </>
        )}
      </div>
    </div>
  );
}
