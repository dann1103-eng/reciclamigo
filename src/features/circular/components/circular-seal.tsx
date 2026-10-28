import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/** Sello de "Comercio Circular". Apagado mientras el comercio no tiene su primera entrega confirmada. */
export function CircularSeal({ earned = true, size = "md", className }: { earned?: boolean; size?: "md" | "lg"; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border-2",
        size === "lg" ? "size-20" : "size-14",
        earned ? "border-brand bg-brand-soft" : "border-dashed border-input bg-paper-2",
        className,
      )}
    >
      <LogoMark className={cn(size === "lg" ? "h-11" : "h-8", !earned && "opacity-40 grayscale")} />
    </span>
  );
}
