"use client";

import { LoaderCircle } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { buttonVariants } from "@/components/ui/button";

import { redeemPoints } from "../actions";
import { MAX_NOTE } from "../schemas";

import { actionButton, fieldClass } from "./styles";
import { FeedbackLine, useRunAction } from "./use-run-action";

/** Registra un canje manual de ReciclaPuntos. No se puede deshacer, así que pide confirmar antes. */
export function RedeemForm({ profileId, name, balance }: { profileId: string; name: string; balance: number }) {
  const pointsId = useId();
  const noteId = useId();
  const [pointsRaw, setPointsRaw] = useState("");
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const { pending, feedback, setFeedback, run } = useRunAction();

  const points = /^\d+$/.test(pointsRaw.trim()) ? Number(pointsRaw.trim()) : null;

  function ask(event: FormEvent) {
    event.preventDefault();
    if (points === null || points < 1) {
      return setFeedback({ kind: "error", message: "Escribe los puntos a canjear como número entero, por ejemplo 150" });
    }
    setFeedback(null);
    setConfirming(true);
  }

  function confirm() {
    if (points === null) return;
    run(
      () => redeemPoints({ profileId, points, note: note.trim() || undefined }),
      `Canje registrado: se descontaron ${points} puntos a ${name}`,
      () => {
        setPointsRaw("");
        setNote("");
        setConfirming(false);
      },
    );
  }

  return (
    <form onSubmit={ask} className="flex flex-col gap-4 rounded-xl border border-border bg-card px-4 py-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold">Registrar un canje</h3>
        <p className="text-sm text-muted-foreground">
          El canje es manual por ahora: entrega el premio y aquí registra los puntos que se descuentan. Se descuentan primero los
          que caducan antes.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={pointsId} className="text-sm font-semibold">
            Puntos a canjear
          </label>
          <input
            id={pointsId}
            inputMode="numeric"
            autoComplete="off"
            value={pointsRaw}
            onChange={(e) => {
              setPointsRaw(e.target.value);
              setConfirming(false);
              setFeedback(null);
            }}
            disabled={pending}
            aria-describedby={`${pointsId}-saldo`}
            className={`${fieldClass} tabular w-40`}
          />
          <span id={`${pointsId}-saldo`} className="tabular text-xs text-muted-foreground">
            Saldo disponible: {balance} puntos
          </span>
        </div>
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <label htmlFor={noteId} className="text-sm font-semibold">
            Nota (opcional)
          </label>
          <input
            id={noteId}
            value={note}
            maxLength={MAX_NOTE}
            onChange={(e) => setNote(e.target.value)}
            disabled={pending}
            placeholder="Qué se entregó a cambio"
            autoComplete="off"
            className={`${fieldClass} w-full`}
          />
        </div>
      </div>

      {confirming && points !== null ? (
        <div role="group" aria-label="Confirmar el canje" className="flex flex-wrap items-center gap-2 rounded-lg bg-paper-2 px-3 py-2">
          <p className="text-sm">
            ¿Descontar <strong className="tabular">{points}</strong> puntos a {name}? No se puede deshacer.
          </p>
          <button type="button" onClick={confirm} disabled={pending} className={buttonVariants({ size: "lg", className: actionButton })}>
            {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
            Sí, registrar canje
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
      ) : (
        <div>
          <button type="submit" disabled={pending || balance <= 0} className={buttonVariants({ size: "lg", className: actionButton })}>
            Registrar canje
          </button>
          {balance <= 0 ? <p className="mt-2 text-sm text-muted-foreground">No tiene puntos para canjear.</p> : null}
        </div>
      )}

      <FeedbackLine feedback={feedback} />
    </form>
  );
}
