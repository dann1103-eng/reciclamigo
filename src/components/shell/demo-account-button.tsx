"use client";

import { ChevronRight, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

import type { DemoRole } from "@/lib/demo/accounts";
import { cn } from "@/lib/utils";

import { useDemoSwitch } from "./use-demo-switch";

/** Botón grande para entrar con una cuenta demo. Si falla, muestra el aviso debajo. */
export function DemoAccountButton({
  role,
  icon,
  title,
  account,
  detail,
  quiet = false,
}: {
  role: DemoRole;
  icon: ReactNode;
  title: string;
  account: string;
  detail: string;
  quiet?: boolean;
}) {
  const { switchTo, pending, error } = useDemoSwitch();
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => switchTo(role)}
        className={cn(
          "group flex w-full items-center gap-4 rounded-xl border text-left transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70",
          quiet
            ? "min-h-16 border-border bg-transparent px-4 py-3 hover:bg-paper-2"
            : "min-h-20 border-border bg-card px-4 py-4 shadow-raised hover:border-brand",
        )}
      >
        <span
          className={cn(
            "grid shrink-0 place-items-center rounded-full",
            quiet ? "size-10 bg-paper-2 text-muted-foreground" : "size-12 bg-brand-soft text-brand",
          )}
        >
          {icon}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={cn("font-bold", quiet ? "text-base" : "text-lg")}>{title}</span>
          <span className="text-sm font-medium">{account}</span>
          <span className="text-sm text-muted-foreground">{detail}</span>
        </span>
        {pending ? (
          <LoaderCircle className="size-5 shrink-0 animate-spin text-muted-foreground" aria-label="Entrando" />
        ) : (
          <ChevronRight
            className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        )}
      </button>
      {error ? (
        <p role="alert" className="px-1 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
