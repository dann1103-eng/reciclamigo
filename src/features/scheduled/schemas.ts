import { z } from "zod";

import { MAX_LB, MAX_NOTES, MIN_LB } from "@/features/lots/schemas";

const hhmm = (message: string) => z.string({ error: message }).regex(/^([01]\d|2[0-3]):[0-5]\d$/, message);

/** Lo que guarda un retiro programado. Las horas van como HH:MM y el día como 0 (domingo) a 6 (sábado). */
export const saveScheduledSchema = z
  .object({
    id: z.uuid({ error: "Retiro programado inválido" }).optional(),
    collectorId: z.uuid({ error: "Elige el reciclador de confianza" }),
    polymerCode: z.enum(["PET", "HDPE", "LDPE", "PP", "PS"], { error: "Elige el tipo de plástico" }),
    estimatedLb: z
      .number({ error: "Escribe las libras, por ejemplo 120 o 95,5" })
      .min(MIN_LB, "El lote debe pesar al menos 0.1 lb")
      .max(MAX_LB, "Máximo 22,000 lb por lote"),
    modality: z.enum(["venta", "trueque", "donacion"], { error: "Elige venta, trueque o donación" }),
    weekday: z
      .number({ error: "Elige el día de la semana" })
      .int("Elige el día de la semana")
      .min(0, "Elige el día de la semana")
      .max(6, "Elige el día de la semana"),
    startTime: hhmm("Elige la hora inicial"),
    endTime: hhmm("Elige la hora final"),
    notes: z.string().trim().max(MAX_NOTES, `Las notas pueden tener hasta ${MAX_NOTES} caracteres`).optional(),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: "La hora final debe ser después de la inicial",
    path: ["endTime"],
  });

export type SaveScheduledInput = z.infer<typeof saveScheduledSchema>;
