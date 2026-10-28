// Mismos valores que los enums de la base de datos (supabase/migrations).
export type UserRole = "generador" | "valorizador" | "municipalidad" | "administrador";
export type TipoValorizador = "base" | "volumen";
export type PlanTier = "gratis" | "trazabilidad";
export type Modality = "venta" | "trueque" | "donacion";
export type LotStatus = "publicado" | "reservado" | "entregado" | "completado" | "cancelado";
export type PaymentMethod = "efectivo" | "transferencia" | "chivo_wallet";
