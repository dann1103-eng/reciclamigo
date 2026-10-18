import { z } from "zod";

export const MIN_KG = 0.1; // menos que esto se redondea a 0 en la base
export const MAX_KG = 10_000;
export const MAX_NOTES = 280;

const kg = z
  .number({ error: "Escribe los kg" })
  .min(MIN_KG, "El lote debe pesar al menos 0.1 kg")
  .max(MAX_KG, "Máximo 10,000 kg por lote");

export const publishLotSchema = z
  .object({
    polymerCode: z.enum(["PET", "HDPE", "LDPE", "PP", "PS"], { error: "Elige el tipo de plástico" }),
    estimatedKg: kg,
    pickupFrom: z.iso.datetime({ offset: true, error: "Elige la fecha y hora de retiro" }),
    pickupTo: z.iso.datetime({ offset: true, error: "Elige la fecha y hora de retiro" }),
    modality: z.enum(["venta", "trueque", "donacion"], { error: "Elige venta, trueque o donación" }),
    photoUrls: z
      .array(z.url({ protocol: /^https$/, error: "Una de las fotos no es válida" }))
      .max(3, "Máximo 3 fotos por lote"),
    notes: z.string().trim().max(MAX_NOTES, `Las notas pueden tener hasta ${MAX_NOTES} caracteres`).optional(),
  })
  .refine((d) => new Date(d.pickupTo) > new Date(d.pickupFrom), {
    message: "La hora final debe ser después de la inicial",
    path: ["pickupTo"],
  })
  .refine((d) => new Date(d.pickupTo) > new Date(), {
    message: "La ventana de retiro ya pasó",
    path: ["pickupTo"],
  });

export type PublishLotInput = z.infer<typeof publishLotSchema>;

export const PAYMENT_METHODS = ["efectivo", "transferencia", "chivo_wallet"] as const;

export const completePickupSchema = z.object({
  pickupId: z.uuid({ error: "Retiro inválido" }),
  confirmedKg: kg,
  paymentMethod: z.enum(PAYMENT_METHODS, { error: "Elige cómo se pagó" }),
});

export type CompletePickupInput = z.infer<typeof completePickupSchema>;

/** Convierte lo que escribe la persona ("35,5" o "35.5") en número; null si no lo es. */
export function parseKg(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

/** Primer mensaje de error de zod, para mostrarlo tal cual. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisa los datos del formulario";
}
