"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";

import type { TipoValorizador } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

import { setValorizadorTipo } from "../actions";
import { TIPO_LABEL } from "../labels";

import { FeedbackLine, useRunAction } from "./use-run-action";

/** Cambia el tipo de un valorizador con un toque en la otra opción. */
export function TipoSwitch({ profileId, name, tipo }: { profileId: string; name: string; tipo: TipoValorizador }) {
  const { pending, feedback, run } = useRunAction();
  const [target, setTarget] = useState<TipoValorizador | null>(null);

  function choose(next: TipoValorizador) {
    if (next === tipo) return;
    setTarget(next);
    run(() => setValorizadorTipo({ profileId, tipo: next }), `${name} ahora es ${TIPO_LABEL[next].toLowerCase()}`);
  }

  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label={`Tipo de ${name}`} className="inline-flex w-fit overflow-hidden rounded-lg border border-border">
        {(Object.keys(TIPO_LABEL) as TipoValorizador[]).map((option) => {
          const active = option === tipo;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              disabled={pending}
              onClick={() => choose(option)}
              className={cn(
                "inline-flex h-11 items-center gap-2 px-4 text-sm font-semibold transition-colors duration-200 outline-none focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70",
                active ? "bg-brand text-brand-foreground" : "bg-card text-muted-foreground hover:bg-paper-2 hover:text-foreground",
              )}
            >
              {pending && target === option ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
              {TIPO_LABEL[option]}
            </button>
          );
        })}
      </div>
      <FeedbackLine feedback={feedback} />
    </div>
  );
}
