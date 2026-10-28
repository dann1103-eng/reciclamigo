import type { TipoValorizador, UserRole } from "@/lib/domain/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** El id llega de la dirección: se revisa antes de consultar para que basura dé "no existe", no un error de la base. */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** Alcaldía y administración no tienen perfil público para los demás usuarios. */
export function viewableRole(role: UserRole): role is "generador" | "valorizador" {
  return role === "generador" || role === "valorizador";
}

const KIND_LABEL: Record<TipoValorizador, string> = {
  base: "Reciclador de base",
  volumen: "Comprador de volumen",
};

/** Tipo de valorizador; null si el administrador aún no lo clasificó. */
export function valorizadorKindLabel(tipo: TipoValorizador | null): string | null {
  return tipo ? KIND_LABEL[tipo] : null;
}

/** "Restaurante · Santa Ana · Centro", sin partes vacías. */
export function profileSubtitle(p: { orgType: string; municipality: string; zone: string }): string {
  return [p.orgType, p.municipality, p.zone]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" · ");
}

export function starsLabel(stars: number): string {
  return `${stars} de 5 estrellas`;
}

const oneDecimal = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 1 });

export function ratingsLabel(avg: number | null, count: number): string {
  if (avg === null || count === 0) return "Sin calificaciones todavía";
  return `${oneDecimal.format(avg)} ★ de ${count} ${count === 1 ? "calificación" : "calificaciones"}`;
}
