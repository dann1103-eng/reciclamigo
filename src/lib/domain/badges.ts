import type { UserRole } from "./types";

export type ProfileStats = {
  role: UserRole;
  /** Entregas confirmadas (con peso real). Publicar un lote no cuenta. */
  completedCount: number;
  completedLb: number;
  ratingAvg: number | null;
  ratingCount: number;
  verified: boolean;
};

export type BadgeId = "comercio-circular" | "primera-entrega" | "1-quintal" | "1-tonelada" | "5-estrellas" | "verificado";

export type Badge = { id: BadgeId; label: string; description: string };

const LB_PER_TONNE = 2204.62;

const BADGES: { badge: Badge; earned: (s: ProfileStats) => boolean }[] = [
  {
    badge: {
      id: "comercio-circular",
      label: "Comercio Circular",
      description: "Tiene al menos una entrega de plástico confirmada en Reciclamigo.",
    },
    earned: (s) => s.role === "generador" && s.completedCount >= 1,
  },
  {
    badge: {
      id: "primera-entrega",
      label: "Primera entrega",
      description: "Confirmó su primera entrega de plástico.",
    },
    earned: (s) => s.role === "valorizador" && s.completedCount >= 1,
  },
  {
    badge: {
      id: "1-quintal",
      label: "1 quintal",
      description: "100 lb o más de plástico entregadas y confirmadas.",
    },
    earned: (s) => s.completedLb >= 100,
  },
  {
    badge: {
      id: "1-tonelada",
      label: "1 tonelada desviada",
      description: "Una tonelada de plástico de vuelta a la industria.",
    },
    earned: (s) => s.completedLb >= LB_PER_TONNE,
  },
  {
    badge: {
      id: "5-estrellas",
      label: "5 estrellas",
      description: "Promedio de 4.8 o más con al menos 3 calificaciones.",
    },
    earned: (s) => s.ratingCount >= 3 && (s.ratingAvg ?? 0) >= 4.8,
  },
  {
    badge: {
      id: "verificado",
      label: "Reciclador verificado",
      description: "Identidad y zona de trabajo verificadas por Reciclamigo.",
    },
    earned: (s) => s.role === "valorizador" && s.verified,
  },
];

export function computeBadges(stats: ProfileStats): Badge[] {
  return BADGES.filter(({ earned }) => earned(stats)).map(({ badge }) => badge);
}
