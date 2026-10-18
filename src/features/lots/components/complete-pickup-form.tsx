"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";
import { formatUSD } from "@/lib/domain/format";
import { suggestedTotal } from "@/lib/domain/pricing";
import type { PaymentMethod } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

import { completePickup } from "../actions";
import type { MyPickup } from "../pickups";
import { completePickupSchema, firstIssue, parseKg } from "../schemas";

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  efectivo: "Efectivo con comprobante",
  transferencia: "Transferencia",
  chivo_wallet: "Chivo Wallet",
};

/** Confirmación del retiro, abierta dentro de la fila (sin modal). */
export function CompletePickupForm({ pickup, onCancel }: { pickup: MyPickup; onCancel: () => void }) {
  const router = useRouter();
  const [kgRaw, setKgRaw] = useState(String(pickup.estimatedKg));
  const [payment, setPayment] = useState<PaymentMethod>("efectivo");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const kg = parseKg(kgRaw);
  const total = kg ? suggestedTotal(kg, pickup.pricePerKg, pickup.modality) : 0;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (kg === null) return setError("Escribe los kg reales, por ejemplo 35,5");
    const input = { pickupId: pickup.id, confirmedKg: kg, paymentMethod: payment };
    const check = completePickupSchema.safeParse(input);
    if (!check.success) return setError(firstIssue(check.error));

    startTransition(async () => {
      try {
        const result = await completePickup(input);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        toast.success("Retiro completado", { description: `Certificado ${result.data.certificateCode}` });
        router.push(`/reciclador/retiros?completado=${pickup.id}`);
        router.refresh();
      } catch {
        setError("No se pudo confirmar el retiro. Revisa la conexión e inténtalo de nuevo.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 rounded-lg bg-paper-2 p-4">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Kg reales pesados
        <span className="flex items-center gap-2">
          <input
            inputMode="decimal"
            autoComplete="off"
            value={kgRaw}
            onChange={(e) => setKgRaw(e.target.value)}
            aria-invalid={kg === null}
            className="tabular h-12 w-36 rounded-lg border border-input bg-card px-3 text-lg font-semibold outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          />
          <span className="text-muted-foreground">kg</span>
        </span>
      </label>

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

      <p className="tabular text-sm">
        {pickup.modality === "venta" ? (
          <>
            Total: <strong className="text-base">{formatUSD(total)}</strong>
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
          {pending ? "Confirmando…" : "Confirmar retiro"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className={buttonVariants({ size: "lg", variant: "ghost", className: "h-11 px-4" })}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
