import type { UserRole } from "./types";

export type ProfileStats = {
  role: UserRole;
  lotsPublished: number;
  completedCount: number;
  completedKg: number;
  ratingAvg: number | null;
  ratingCount: number;
  verified: boolean;
};

export type BadgeId = "primer-lote" | "100-kg" | "1-tonelada" | "5-estrellas" | "verificado";

export type Badge = { id: BadgeId; label: string; description: string };

const BADGES: { badge: Badge; earned: (s: ProfileStats) => boolean }[] = [
  {
    badge: { id: "primer-lote", label: "Primer lote", description: "Publicó o recogió su primer lote de plástico." },
    earned: (s) =>
      (s.role === "generador" && s.lotsPublished >= 1) ||
      (s.role === "valorizador" && s.completedCount >= 1),
  },
  {
    badge: { id: "100-kg", label: "100 kg", description: "Más de 100 kg de plástico fuera del vertedero." },
    earned: (s) => s.completedKg >= 100,
  },
  {
    badge: { id: "1-tonelada", label: "1 tonelada desviada", description: "Una tonelada de plástico de vuelta a la industria." },
    earned: (s) => s.completedKg >= 1000,
  },
  {
    badge: { id: "5-estrellas", label: "5 estrellas", description: "Promedio de 4.8 o más con al menos 3 calificaciones." },
    earned: (s) => s.ratingCount >= 3 && (s.ratingAvg ?? 0) >= 4.8,
  },
  {
    badge: { id: "verificado", label: "Reciclador verificado", description: "Identidad y zona de trabajo verificadas por Reciclamigo." },
    earned: (s) => s.role === "valorizador" && s.verified,
  },
];

export function computeBadges(stats: ProfileStats): Badge[] {
  return BADGES.filter(({ earned }) => earned(stats)).map(({ badge }) => badge);
}
