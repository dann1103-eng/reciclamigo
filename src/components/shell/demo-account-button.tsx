"use client";

import { ChevronRight, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

/** Botón grande para entrar con una cuenta demo (va dentro de un <form> con la server action). */
export function DemoAccountButton({
  icon,
  title,
  account,
  detail,
  quiet = false,
}: {
  icon: ReactNode;
  title: string;
  account: string;
  detail: string;
  quiet?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
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
        <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
      )}
    </button>
  );
}
