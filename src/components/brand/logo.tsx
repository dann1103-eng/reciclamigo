import { cn } from "@/lib/utils";

/**
 * Símbolo: un pin de mapa (la cercanía es el corazón del producto) con una
 * flecha en lazo adentro (el material vuelve a la industria).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 40"
      aria-hidden="true"
      className={cn("h-9 w-auto shrink-0", className)}
    >
      <path
        d="M16 39.2c-.6 0-1.1-.3-1.5-.8C10.9 33.9 3 23.6 3 15.6 3 8.1 8.8 2 16 2s13 6.1 13 13.6c0 8-7.9 18.3-11.5 22.8-.4.5-.9.8-1.5.8Z"
        fill="var(--brand)"
      />
      <path
        d="M19.6 9.9a6.6 6.6 0 1 1-7.7.1"
        fill="none"
        stroke="var(--brand-foreground)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path d="M10.3 6.6l5.2 1.6-3.4 4.4z" fill="var(--brand-foreground)" />
      <circle cx="16" cy="15.6" r="2" fill="var(--accent-warm)" />
    </svg>
  );
}

export function Logo({ className, markOnly = false }: { className?: string; markOnly?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-foreground", className)}>
      <LogoMark />
      {markOnly ? (
        <span className="sr-only">Reciclamigo</span>
      ) : (
        <span className="text-2xl leading-none font-extrabold tracking-[-0.02em] [font-stretch:85%]">
          Reciclamigo
        </span>
      )}
    </span>
  );
}
