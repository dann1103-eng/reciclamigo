"use client";

import { LoaderCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { FeedbackLine, useRunAction } from "@/features/admin/components/use-run-action";

import { requestPlan } from "../actions";

/** "Pedir activación": avisa al equipo de Reciclamigo, que activa el plan a mano. */
export function RequestPlanButton({ label, variant = "default" }: { label: string; variant?: "default" | "outline" }) {
  const { pending, feedback, run } = useRunAction();

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => requestPlan(), "Listo: avisamos al equipo de Reciclamigo. Te contactan para activar tu plan.")}
        className={buttonVariants({ size: "xl", variant })}
      >
        {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
        {label}
      </button>
      <FeedbackLine feedback={feedback} />
    </div>
  );
}
