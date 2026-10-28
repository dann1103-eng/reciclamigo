import { describe, expect, test } from "vitest";

import { profileStatsFromRow, reputationFromRow, type ProfileImpactRow } from "./profile-impact";

const row: ProfileImpactRow = {
  profile_id: "x",
  role: "valorizador",
  display_name: "Don José",
  org_type: "Reciclador de base",
  municipality: "Santa Ana",
  verified: true,
  lots_published: 0,
  completed_count: 12,
  completed_lb: 3197.8,
  total_amount: 210.4,
  rating_avg: 4.83,
  rating_count: 12,
  reputation_tier: "destacado",
  reputation_score: 11.6,
};

describe("profileStatsFromRow", () => {
  test("convierte la fila de la vista en estadísticas para insignias", () => {
    expect(profileStatsFromRow(row)).toEqual({
      role: "valorizador",
      completedCount: 12,
      completedLb: 3197.8,
      ratingAvg: 4.83,
      ratingCount: 12,
      verified: true,
    });
  });

  test("acepta numéricos como texto (PostgREST con numeric grandes)", () => {
    const stats = profileStatsFromRow({ ...row, completed_lb: "78.26" as unknown as number, rating_avg: "5.00" as unknown as number });
    expect(stats.completedLb).toBe(78.26);
    expect(stats.ratingAvg).toBe(5);
  });

  test("sin calificaciones el promedio es null y los nulos valen cero", () => {
    const stats = profileStatsFromRow({ ...row, rating_avg: null, rating_count: null, completed_lb: null, completed_count: null, verified: null });
    expect(stats).toMatchObject({ ratingAvg: null, ratingCount: 0, completedLb: 0, completedCount: 0, verified: false });
  });
});

describe("reputationFromRow", () => {
  test("toma el nivel de la vista", () => {
    expect(reputationFromRow(row)).toEqual({ tier: "destacado", completedCount: 12, ratingAvg: 4.83, ratingCount: 12 });
  });

  test("un perfil sin fila es nuevo", () => {
    expect(reputationFromRow(null)).toEqual({ tier: "nuevo", completedCount: 0, ratingAvg: null, ratingCount: 0 });
  });
});
