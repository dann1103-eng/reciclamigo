/**
 * Número de WhatsApp en formato internacional de El Salvador, solo dígitos (503XXXXXXXX).
 * Misma regla que `normalize_sv_phone` en la base de datos: 8 dígitos -> se antepone 503.
 */
export function normalizeSvPhone(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "").replace(/^00/, "");
  if (!digits) return null;
  return digits.length === 8 ? `503${digits}` : digits;
}
