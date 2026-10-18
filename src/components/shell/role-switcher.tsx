"use client";

import type { DemoRole } from "@/lib/demo/accounts";
import { cn } from "@/lib/utils";

import { SwitchError } from "./switch-error";
import { useDemoSwitch } from "./use-demo-switch";

const OPTIONS: { role: DemoRole; label: string }[] = [
  { role: "comercio", label: "Comercio" },
  { role: "reciclador", label: "Reciclador" },
];

/** "Ver como: Comercio | Reciclador". Cambia de cuenta demo en un toque. */
export function RoleSwitcher({ current }: { current: DemoRole }) {
  const { switchTo, pending, error, clearError } = useDemoSwitch();
  return (
    <>
      <div
        role="group"
        aria-label="Ver como"
        aria-busy={pending}
        className={cn("inline-flex rounded-xl bg-paper-2 p-1", pending && "opacity-70")}
      >
        {OPTIONS.map(({ role, label }) => {
          const active = role === current;
          return (
            <button
              key={role}
              type="button"
              aria-pressed={active}
              disabled={pending}
              onClick={() => !active && switchTo(role)}
              className={cn(
                "h-11 rounded-lg px-3 text-sm font-semibold transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-4",
                active ? "bg-card text-foreground shadow-raised" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      {error ? <SwitchError message={error} onClose={clearError} /> : null}
    </>
  );
}
