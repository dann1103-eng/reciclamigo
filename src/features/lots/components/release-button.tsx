"use client";

import { LoaderCircle, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";

import { releaseReservation } from "../actions";

/**
 * Suelta la reserva con un toque (dos pasos para no soltarla por error). El lote se publica de nuevo
 * y se avisa a otros recicladores. `by` solo cambia el texto de la confirmación.
 */
export function ReleaseButton({ pickupId, by }: { pickupId: string; by: "comercio" | "reciclador" }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();

  function release() {
    startTransition(async () => {
      try {
        const result = await releaseReservation(pickupId);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Reserva liberada", { description: "El lote se publicó de nuevo y se avisó a otros recicladores." });
        setAsking(false);
        router.refresh();
      } catch {
        toast.error("No se pudo liberar la reserva. Revisa la conexión e inténtalo de nuevo.");
      }
    });
  }

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className={buttonVariants({ size: "lg", variant: "ghost", className: "h-11 px-4" })}
      >
        <Undo2 aria-hidden="true" />
        Liberar reserva
      </button>
    );
  }

  return (
    <div role="group" aria-label="Confirmar que se libera la reserva" className="flex flex-wrap items-center gap-2 rounded-lg bg-paper-2 px-3 py-2">
      <p className="text-sm">
        {by === "comercio" ? "¿El reciclador no llegó? El lote se publica de nuevo." : "¿Ya no vas a recoger este lote? Se publica de nuevo."}
      </p>
      <button
        type="button"
        onClick={release}
        disabled={pending}
        className={buttonVariants({ size: "lg", className: "h-11 px-4" })}
      >
        {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
        {pending ? "Liberando…" : "Sí, liberar"}
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        disabled={pending}
        className={buttonVariants({ size: "lg", variant: "ghost", className: "h-11 px-4" })}
      >
        Cancelar
      </button>
    </div>
  );
}
