"use client";

import { LoaderCircle } from "lucide-react";
import { useId, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { endOfSvDayIso, formatSvDate } from "@/features/plans/dates";

import { setGeneratorPlan } from "../actions";
import type { PlanState } from "../plan-list";

import { actionButton, fieldClass } from "./styles";
import { FeedbackLine, useRunAction } from "./use-run-action";

const ACTIVATE_LABEL: Record<PlanState, string> = {
  gratis: "Activar",
  vencido: "Activar de nuevo",
  activo: "Cambiar vencimiento",
};

/**
 * Activa o desactiva el Plan Trazabilidad de un comercio. El plan queda vigente durante todo el día
 * elegido (hora de El Salvador). Desactivar pide confirmación porque el comercio vuelve al plan gratis al instante.
 */
export function PlanActions({
  profileId,
  name,
  state,
  defaultExpiresOn,
  minExpiresOn,
}: {
  profileId: string;
  name: string;
  state: PlanState;
  /** Hoy + plan_duracion_dias, calculado en el servidor. */
  defaultExpiresOn: string;
  /** Hoy: la base exige un vencimiento futuro. */
  minExpiresOn: string;
}) {
  const dateId = useId();
  const [expiresOn, setExpiresOn] = useState(defaultExpiresOn);
  const [confirming, setConfirming] = useState(false);
  const { pending, feedback, setFeedback, run } = useRunAction();

  function activate() {
    if (!expiresOn) return setFeedback({ kind: "error", message: "Elige la fecha de vencimiento" });
    const iso = endOfSvDayIso(expiresOn);
    if (!iso) return setFeedback({ kind: "error", message: "Elige una fecha de vencimiento válida" });
    run(
      () => setGeneratorPlan({ profileId, plan: "trazabilidad", expiresOn }),
      `Plan Trazabilidad activo hasta el ${formatSvDate(iso)}`,
    );
  }

  function deactivate() {
    run(() => setGeneratorPlan({ profileId, plan: "gratis" }), "Plan desactivado: el comercio volvió al plan gratis", () =>
      setConfirming(false),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={dateId} className="text-sm font-semibold">
            Activo hasta
          </label>
          <input
            id={dateId}
            type="date"
            value={expiresOn}
            min={minExpiresOn}
            onChange={(e) => setExpiresOn(e.target.value)}
            disabled={pending}
            className={fieldClass}
          />
        </div>
        <button
          type="button"
          onClick={activate}
          disabled={pending}
          aria-label={`${ACTIVATE_LABEL[state]}: ${name}`}
          className={buttonVariants({ size: "lg", className: actionButton })}
        >
          {pending && !confirming ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
          {ACTIVATE_LABEL[state]}
        </button>
        {state === "activo" && !confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={pending}
            aria-label={`Desactivar: ${name}`}
            className={buttonVariants({ size: "lg", variant: "outline", className: actionButton })}
          >
            Desactivar
          </button>
        ) : null}
      </div>

      {confirming ? (
        <div role="group" aria-label={`Confirmar que se desactiva el plan de ${name}`} className="flex flex-wrap items-center gap-2 rounded-lg bg-paper-2 px-3 py-2">
          <p className="text-sm">¿Desactivar el plan de {name}? Vuelve al plan gratis hoy mismo.</p>
          <button type="button" onClick={deactivate} disabled={pending} className={buttonVariants({ size: "lg", variant: "destructive", className: actionButton })}>
            {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
            Sí, desactivar
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className={buttonVariants({ size: "lg", variant: "ghost", className: actionButton })}
          >
            Cancelar
          </button>
        </div>
      ) : null}

      <FeedbackLine feedback={feedback} />
    </div>
  );
}
