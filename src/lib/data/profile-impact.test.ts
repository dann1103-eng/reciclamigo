import { describe, expect, test } from "vitest";

import { profileStatsFromRow, type ProfileImpactRow } from "./profile-impact";

const row: ProfileImpactRow = {
  profile_id: "x",
  role: "valorizador",
  display_name: "Don José",
  org_type: "Reciclador de base",
  municipality: "Santa Ana",
  verified: true,
  lots_published: 0,
  completed_count: 12,
  completed_kg: 1450.5,
  total_amount: 210.4,
  rating_avg: 4.83,
  rating_count: 12,
};

describe("profileStatsFromRow", () => {
  test("convierte la fila de la vista en estadísticas para insignias", () => {
    expect(profileStatsFromRow(row)).toEqual({
      role: "valorizador",
      lotsPublished: 0,
      completedCount: 12,
      completedKg: 1450.5,
      ratingAvg: 4.83,
      ratingCount: 12,
      verified: true,
    });
  });

  test("acepta numéricos como texto (PostgREST con numeric grandes)", () => {
    const stats = profileStatsFromRow({ ...row, completed_kg: "35.50" as unknown as number, rating_avg: "5.00" as unknown as number });
    expect(stats.completedKg).toBe(35.5);
    expect(stats.ratingAvg).toBe(5);
  });

  test("sin calificaciones el promedio es null y los nulos valen cero", () => {
    const stats = profileStatsFromRow({ ...row, rating_avg: null, rating_count: null, completed_kg: null, completed_count: null, lots_published: null, verified: null });
    expect(stats).toMatchObject({ ratingAvg: null, ratingCount: 0, completedKg: 0, completedCount: 0, lotsPublished: 0, verified: false });
  });
});
