import { cn } from "@/lib/utils";

import { LOGO_MARK_PATH, LOGO_MARK_VIEWBOX } from "./logo-mark-path";

/**
 * Símbolo oficial: una bolsa de compras con una botella de plástico adentro (el plástico que
 * tiene comprador). La botella es un hueco: se ve el fondo de la pantalla a través de ella.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox={LOGO_MARK_VIEWBOX} aria-hidden="true" className={cn("h-9 w-auto shrink-0", className)}>
      <path d={LOGO_MARK_PATH} fill="var(--brand)" fillRule="evenodd" />
    </svg>
  );
}

export function Logo({ className, markOnly = false }: { className?: string; markOnly?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-foreground", className)}>
      <LogoMark />
      {markOnly ? (
        <span className="sr-only">Reciclamigo</span>
      ) : (
        <span className="text-xl leading-none font-semibold tracking-[0.09em] text-brand-strong uppercase">
          Reciclamigo
        </span>
      )}
    </span>
  );
}
