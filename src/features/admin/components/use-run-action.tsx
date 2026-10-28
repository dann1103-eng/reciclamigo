"use client";

import { useState, useTransition } from "react";

import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";

export type Feedback = { kind: "ok" | "error"; message: string };

/**
 * Corre una acción de servidor y guarda su resultado para mostrarlo junto al botón.
 * Los errores de la base ya vienen en español: se muestran tal cual.
 */
export function useRunAction() {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  function run(action: () => Promise<ActionResult<unknown>>, okMessage: string, onOk?: () => void) {
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) {
          setFeedback({ kind: "ok", message: okMessage });
          onOk?.();
        } else {
          setFeedback({ kind: "error", message: result.error });
        }
      } catch {
        setFeedback({ kind: "error", message: "No se pudo completar. Revisa la conexión e inténtalo de nuevo." });
      }
    });
  }

  return { pending, feedback, setFeedback, run };
}

/** Resultado de una acción: confirmación (role=status) o error (role=alert). */
export function FeedbackLine({ feedback, className }: { feedback: Feedback | null; className?: string }) {
  if (!feedback) return null;
  return feedback.kind === "ok" ? (
    <p role="status" className={cn("rounded-lg bg-brand-soft px-3 py-2 text-sm font-medium text-brand", className)}>
      {feedback.message}
    </p>
  ) : (
    <p role="alert" className={cn("rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive", className)}>
      {feedback.message}
    </p>
  );
}
