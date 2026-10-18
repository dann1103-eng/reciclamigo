import { computeBadges, type ProfileStats } from "@/lib/domain/badges";

// Versión básica; Track B la pule sin cambiar la firma.
export function BadgeList({ stats }: { stats: ProfileStats }) {
  const badges = computeBadges(stats);
  if (badges.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Insignias">
      {badges.map((badge) => (
        <li
          key={badge.id}
          title={badge.description}
          className="rounded-full bg-accent-warm-soft px-2.5 py-1 text-xs font-semibold text-accent-warm-ink"
        >
          {badge.label}
        </li>
      ))}
    </ul>
  );
}
