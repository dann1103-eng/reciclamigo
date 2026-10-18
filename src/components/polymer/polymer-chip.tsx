import { POLYMERS, type PolymerCode } from "@/lib/domain/polymers";
import { cn } from "@/lib/utils";

// Sobre HDPE y PS (colores claros) el número va en tinta oscura para que se lea.
const DARK_INK: PolymerCode[] = ["HDPE", "PS"];

/** Color del texto que va encima del color de un polímero. */
export function polymerInk(code: PolymerCode): string {
  return DARK_INK.includes(code) ? "var(--ink)" : "var(--paper)";
}

/** Disco del color del polímero con su número de resina, igual que los pines del mapa. */
export function ResinMark({ code, className }: { code: PolymerCode; className?: string }) {
  const { resinNumber, color } = POLYMERS[code];
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={cn("size-5 shrink-0", className)}>
      <circle cx="10" cy="10" r="10" fill={color} />
      <text
        x="10"
        y="14.2"
        textAnchor="middle"
        fontSize="12"
        fontWeight="800"
        fill={polymerInk(code)}
        className="font-sans"
      >
        {resinNumber}
      </text>
    </svg>
  );
}

/**
 * Chip de polímero. El color nunca va solo: siempre acompaña al código y al
 * número de resina (daltonismo, proyector lavado).
 */
export function PolymerChip({
  code,
  size = "sm",
  className,
}: {
  code: PolymerCode;
  size?: "sm" | "lg";
  className?: string;
}) {
  const { name, color } = POLYMERS[code];
  const tint = `color-mix(in oklch, ${color} 13%, var(--paper))`;
  const edge = `color-mix(in oklch, ${color} 45%, var(--paper))`;

  if (size === "lg") {
    return (
      <span
        className={cn(
          "inline-flex min-h-14 items-center gap-3 rounded-xl border-[1.5px] px-3.5 py-2 text-foreground",
          className,
        )}
        style={{ backgroundColor: tint, borderColor: edge }}
      >
        <ResinMark code={code} className="size-8" />
        <span className="flex flex-col items-start leading-tight">
          <span className="text-lg font-extrabold tracking-tight">{code}</span>
          <span className="text-xs text-muted-foreground">{name}</span>
        </span>
      </span>
    );
  }

  return (
    <span
      title={name}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-sm font-bold text-foreground",
        className,
      )}
      style={{ backgroundColor: tint, borderColor: edge }}
    >
      <ResinMark code={code} className="size-[1.125rem]" />
      {code}
    </span>
  );
}
