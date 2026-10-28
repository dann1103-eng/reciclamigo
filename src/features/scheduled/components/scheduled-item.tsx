"use client";

import { LoaderCircle, Pause, Pencil, Play, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PolymerChip } from "@/components/polymer/polymer-chip";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { deleteScheduledPickup, setScheduledActive } from "../actions";
import type { ScheduledView } from "../format";

const MODALITY_NAME = { venta: "Venta", trueque: "Trueque", donacion: "Donación" } as const;

const ghost = buttonVariants({ size: "lg", variant: "ghost", className: "h-11 px-4" });

/** Un retiro programado: pausar o reanudar, editar y borrar (con confirmación). */
export function ScheduledItem({
  pickup,
  onEdit,
  onPlanRequired,
}: {
  pickup: ScheduledView;
  onEdit: () => void;
  onPlanRequired: (message: string) => void;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: () => ReturnType<typeof setScheduledActive>, success: string) {
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) {
          toast.error(result.error);
          if (result.code === "requiere_plan") onPlanRequired(result.error);
          return;
        }
        toast.success(success);
        setAsking(false);
        router.refresh();
      } catch {
        toast.error("No se pudo completar. Revisa la conexión e inténtalo de nuevo.");
      }
    });
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-4">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="tabular font-semibold">{pickup.description}</p>
        <div className="flex flex-wrap items-center gap-2">
          <PolymerChip code={pickup.polymerCode} />
          <span className="rounded-full bg-paper-2 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
            {MODALITY_NAME[pickup.modality]}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
              pickup.active ? "bg-brand-soft text-brand" : "bg-accent-warm-soft text-accent-warm-ink",
            )}
          >
            {pickup.active ? "Activo" : "En pausa"}
          </span>
        </div>
        {pickup.active ? (
          pickup.nextLabel ? (
            <p className="tabular text-sm text-muted-foreground">Próximo retiro: {pickup.nextLabel}</p>
          ) : null
        ) : (
          <p className="text-sm text-muted-foreground">En pausa no se crean lotes. Reanúdalo cuando quieras.</p>
        )}
        {pickup.notes ? <p className="text-sm text-muted-foreground">{pickup.notes}</p> : null}
      </div>

      {asking ? (
        <div role="group" aria-label="Confirmar que se borra el retiro programado" className="flex flex-wrap items-center gap-2 rounded-lg bg-paper-2 px-3 py-2">
          <p className="text-sm">¿Borrar este retiro? Los lotes que ya creó siguen su curso.</p>
          <button
            type="button"
            onClick={() => run(() => deleteScheduledPickup(pickup.id), "Retiro programado borrado")}
            disabled={pending}
            className={buttonVariants({ size: "lg", variant: "destructive", className: "h-11 px-4" })}
          >
            {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
            {pending ? "Borrando…" : "Sí, borrar"}
          </button>
          <button type="button" onClick={() => setAsking(false)} disabled={pending} className={ghost}>
            Cancelar
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              run(() => setScheduledActive(pickup.id, !pickup.active), pickup.active ? "Retiro en pausa" : "Retiro reanudado")
            }
            disabled={pending}
            className={buttonVariants({ size: "lg", variant: "outline", className: "h-11 px-4" })}
          >
            {pending ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : pickup.active ? (
              <Pause aria-hidden="true" />
            ) : (
              <Play aria-hidden="true" />
            )}
            {pickup.active ? "Pausar" : "Reanudar"}
          </button>
          <button type="button" onClick={onEdit} disabled={pending} className={ghost}>
            <Pencil aria-hidden="true" />
            Editar
          </button>
          <button type="button" onClick={() => setAsking(true)} disabled={pending} className={ghost}>
            <Trash2 aria-hidden="true" />
            Borrar
          </button>
        </div>
      )}
    </li>
  );
}
