/** Texto corto de cualquier cosa lanzada con `throw` (los errores de Supabase no siempre son `Error`). */
export function errorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string" && error.message) {
    return error.message;
  }
  return "Error desconocido";
}
