"use client";

import { LoaderCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { FeedbackLine, useRunAction } from "@/features/admin/components/use-run-action";

import { setCommissionStatus } from "../actions";

/** Marca una comisión como cobrada o la devuelve a pendiente. Solo registra: no cobra nada. */
export function CommissionStatusButton({ commissionId, status }: { commissionId: string; status: "pendiente" | "cobrada" }) {
  const { pending, feedback, run } = useRunAction();
  const next = status === "pendiente" ? "cobrada" : "pendiente";

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          run(
            () => setCommissionStatus({ commissionId, status: next }),
            next === "cobrada" ? "Marcada como cobrada" : "Volvió a pendiente",
          )
        }
        className={buttonVariants({
          size: "lg",
          variant: status === "pendiente" ? "default" : "outline",
          className: "h-11 px-4",
        })}
      >
        {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
        {status === "pendiente" ? "Marcar cobrada" : "Volver a pendiente"}
      </button>
      <FeedbackLine feedback={feedback} className="max-w-56" />
    </div>
  );
}
