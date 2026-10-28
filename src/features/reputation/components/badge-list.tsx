import { BadgeCheck, PackageCheck, Scale, Star, Store, Weight, type LucideIcon } from "lucide-react";

import { computeBadges, type BadgeId, type ProfileStats } from "@/lib/domain/badges";
import { cn } from "@/lib/utils";

const ICON: Record<BadgeId, LucideIcon> = {
  "comercio-circular": Store,
  "primera-entrega": PackageCheck,
  "1-quintal": Scale,
  "1-tonelada": Weight,
  "5-estrellas": Star,
  verificado: BadgeCheck,
};

// Verde = identidad (negocio con entregas, cuenta verificada); ámbar = calificación; neutro = hitos de libras.
const TONE: Record<BadgeId, string> = {
  "comercio-circular": "bg-brand-soft text-brand",
  verificado: "bg-brand-soft text-brand",
  "5-estrellas": "bg-accent-warm-soft text-accent-warm-ink",
  "primera-entrega": "bg-paper-2 text-foreground",
  "1-quintal": "bg-paper-2 text-foreground",
  "1-tonelada": "bg-paper-2 text-foreground",
};

/**
 * Insignias que ya ganó un perfil, según sus entregas confirmadas, libras y calificaciones.
 * Compacta por defecto; con `showDescriptions` explica cada una (útil donde no hay "hover", como el teléfono).
 */
export function BadgeList({ stats, showDescriptions = false }: { stats: ProfileStats; showDescriptions?: boolean }) {
  const badges = computeBadges(stats);
  if (badges.length === 0) return null;

  if (showDescriptions) {
    return (
      <ul className="grid gap-2 sm:grid-cols-2" aria-label="Insignias">
        {badges.map((badge) => {
          const Icon = ICON[badge.id];
          return (
            <li key={badge.id} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-full", TONE[badge.id])}>
                <Icon className="size-4.5" aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="font-semibold">{badge.label}</span>
                <span className="text-sm text-muted-foreground">{badge.description}</span>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Insignias">
      {badges.map((badge) => {
        const Icon = ICON[badge.id];
        return (
          <li
            key={badge.id}
            title={badge.description}
            className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", TONE[badge.id])}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {badge.label}
          </li>
        );
      })}
    </ul>
  );
}
