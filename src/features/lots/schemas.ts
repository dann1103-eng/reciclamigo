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

export const MAX_COMMENT = 280;

export const ratePickupSchema = z.object({
  pickupId: z.uuid({ error: "Retiro inválido" }),
  stars: z.number().int("Elige de 1 a 5 estrellas").min(1, "Elige de 1 a 5 estrellas").max(5, "Elige de 1 a 5 estrellas"),
  comment: z.string().trim().max(MAX_COMMENT, `El comentario puede tener hasta ${MAX_COMMENT} caracteres`).optional(),
});

export type RatePickupInput = z.infer<typeof ratePickupSchema>;

/**
 * Convierte lo que escribe la persona en número; null si no lo es.
 * "35.5" y "35,5" son decimales. Una coma seguida de grupos de 3 dígitos ("1,250") es de
 * miles, como se escribe en El Salvador: así "1,250" nunca se vuelve 1.25 kg en silencio.
 * Con punto y coma a la vez, el último que aparece es el decimal ("1,250.5" o "1.250,5").
 */
export function parseKg(raw: string): number | null {
  let s = raw.trim().replace(/\s/g, "");
  const comma = s.lastIndexOf(",");
  const dot = s.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    const [thousands, decimal] = comma > dot ? [".", ","] : [",", "."];
    s = s.split(thousands).join("").replace(decimal, ".");
  } else if (comma >= 0) {
    s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

/** Primer mensaje de error de zod, para mostrarlo tal cual. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisa los datos del formulario";
}
