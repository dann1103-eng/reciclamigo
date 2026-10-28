/** Códigos que la base manda en `hint` cuando una regla del plan frena la acción. */
export type ActionErrorCode = "limite_gratis" | "requiere_plan";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: ActionErrorCode };

/** Convierte el error de Supabase (mensaje en español + hint) en un resultado fallido. */
export function failure(error: { message: string; hint?: string | null }): { ok: false; error: string; code?: ActionErrorCode } {
  if (error.hint === "limite_gratis" || error.hint === "requiere_plan") {
    return { ok: false, error: error.message, code: error.hint };
  }
  return { ok: false, error: error.message };
}
