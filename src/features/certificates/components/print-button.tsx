"use client";

import { Printer } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={buttonVariants({ size: "lg", variant: "outline", className: "h-11 px-4 print:hidden" })}
    >
      <Printer aria-hidden="true" />
      Imprimir / Guardar PDF
    </button>
  );
}
