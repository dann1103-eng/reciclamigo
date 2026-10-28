import { z } from "zod";

export const MAX_NOTE = 200;

export const setGeneratorPlanSchema = z.object({
  profileId: z.uuid({ error: "Comercio inválido" }),
  plan: z.enum(["gratis", "trazabilidad"], { error: "Elige un plan" }),
  /** Último día de vigencia (YYYY-MM-DD, hora de El Salvador). Solo se usa al activar. */
  expiresOn: z.string().optional(),
});

export type SetGeneratorPlanInput = z.infer<typeof setGeneratorPlanSchema>;

export const setValorizadorTipoSchema = z.object({
  profileId: z.uuid({ error: "Valorizador inválido" }),
  tipo: z.enum(["base", "volumen"], { error: "Elige el tipo de valorizador" }),
});

export type SetValorizadorTipoInput = z.infer<typeof setValorizadorTipoSchema>;

export const saveSettingSchema = z.object({
  key: z.string().min(1, "Falta el ajuste").max(100),
  /** Lo que el administrador escribió en el campo; se convierte a JSON en el servidor. */
  raw: z.string().max(500, "El valor es demasiado largo"),
});

export type SaveSettingInput = z.infer<typeof saveSettingSchema>;

export const redeemPointsSchema = z.object({
  profileId: z.uuid({ error: "Elige a la persona" }),
  points: z
    .number({ error: "Escribe los puntos a canjear" })
    .int("Los puntos deben ser un número entero")
    .min(1, "Los puntos a canjear deben ser mayores que 0"),
  note: z.string().trim().max(MAX_NOTE, `La nota puede tener hasta ${MAX_NOTE} caracteres`).optional(),
});

export type RedeemPointsInput = z.infer<typeof redeemPointsSchema>;

export const setCommissionStatusSchema = z.object({
  commissionId: z.uuid({ error: "Comisión inválida" }),
  status: z.enum(["pendiente", "cobrada"], { error: "El estado debe ser pendiente o cobrada" }),
});

export type SetCommissionStatusInput = z.infer<typeof setCommissionStatusSchema>;
