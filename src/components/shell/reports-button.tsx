"use client";

import { BarChart3 } from "lucide-react";

import { cn } from "@/lib/utils";

import { SwitchError } from "./switch-error";
import { useDemoSwitch } from "./use-demo-switch";

const base =
  "inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/** Entra a los reportes con la cuenta de alcaldía. Si ya estás ahí, solo marca la ubicación. */
export function ReportsButton({ active }: { active: boolean }) {
  const { switchTo, pending, error, clearError } = useDemoSwitch();
  const label = (
    <>
      <BarChart3 className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">Reportes</span>
      <span className="sr-only sm:hidden">Reportes de alcaldía</span>
    </>
  );

  if (active) {
    return (
      <span aria-current="page" className={cn(base, "bg-brand-soft text-brand")}>
        {label}
      </span>
    );
  }
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => switchTo("alcaldia")}
        className={cn(base, "text-muted-foreground hover:bg-paper-2 hover:text-foreground disabled:opacity-70")}
      >
        {label}
      </button>
      {error ? <SwitchError message={error} onClose={clearError} /> : null}
    </>
  );
}
