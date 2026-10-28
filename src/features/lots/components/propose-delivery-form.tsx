"use client";

import { LoaderCircle, PackageCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";
import { formatPricePerLb, formatUSD } from "@/lib/domain/format";
import { suggestedTotal } from "@/lib/domain/pricing";
import type { Modality } from "@/lib/domain/types";
import { formatLb } from "@/lib/domain/units";

import { proposeDelivery } from "../actions";
import { firstIssue, parseLb, proposeDeliverySchema } from "../schemas";

const fieldClass =
  "tabular h-12 w-36 rounded-lg border border-input bg-card px-3 text-lg font-semibold outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40";

/**
 * El comercio registra el peso real y el precio final de la entrega. Todavía no cuenta: el
 * reciclador la acepta o la corrige. Mientras no la acepte, el comercio puede cambiar lo registrado.
 */
export function ProposeDeliveryForm({
  pickupId,
  collectorName,
  estimatedLb,
  pricePerLb,
  modality,
  registeredLb = null,
  registeredPricePerLb = null,
}: {
  pickupId: string;
  collectorName: string;
  estimatedLb: number;
  /** Precio de referencia del lote (USD/lb). */
  pricePerLb: number;
  modality: Modality;
  /** Si ya registró la entrega, lo que registró (para corregirlo). */
  registeredLb?: number | null;
  registeredPricePerLb?: number | null;
}) {
  const router = useRouter();
  const editing = registeredLb !== null;
  const [open, setOpen] = useState(false);
  const [lbRaw, setLbRaw] = useState(String(registeredLb ?? estimatedLb));
  const [priceRaw, setPriceRaw] = useState(String(registeredPricePerLb ?? pricePerLb));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isSale = modality === "venta";
  const lb = parseLb(lbRaw);
  const price = isSale ? parseLb(priceRaw) : 0;
  const total = lb !== null && price !== null ? suggestedTotal(lb, price, modality) : 0;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (lb === null) return setError("Escribe las libras reales, por ejemplo 100 o 95,5");
    if (isSale && price === null) return setError("Escribe el precio por libra, por ejemplo 0,09");
    const input = { pickupId, lb, ...(isSale && price !== null ? { pricePerLb: price } : {}) };
    const check = proposeDeliverySchema.safeParse(input);
    if (!check.success) return setError(firstIssue(check.error));

    startTransition(async () => {
      try {
        const result = await proposeDelivery(input);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        toast.success("Entrega registrada", { description: `${collectorName} la acepta o la corrige. Entonces cuenta.` });
        setOpen(false);
        router.refresh();
      } catch {
        setError("No se pudo registrar la entrega. Revisa la conexión e inténtalo de nuevo.");
      }
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonVariants({ size: "lg", className: "h-11 px-4" })}>
        <PackageCheck aria-hidden="true" />
        {editing ? "Cambiar lo registrado" : "Registrar entrega"}
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex w-full flex-col gap-4 rounded-lg bg-paper-2 p-4">
      <p className="text-sm text-muted-foreground">
        Escribe lo que pesó de verdad. {collectorName} lo acepta o lo corrige, y solo entonces cuenta la entrega.
      </p>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Libras reales
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
      <p className="tabular text-sm">
        {isSale ? (
          <>
            {lb !== null ? formatLb(lb, 2) : "—"} a {price !== null ? formatPricePerLb(price) : "—"}: total{" "}
            <strong className="text-base">{formatUSD(total)}</strong>
          </>
        ) : (
          "Sin cobro: el lote es una donación o un trueque."
        )}
      </p>
      {error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={buttonVariants({ size: "lg", className: "h-11 px-4" })}>
          {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
          {pending ? "Registrando…" : "Registrar"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          className={buttonVariants({ size: "lg", variant: "ghost", className: "h-11 px-4" })}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
