import { firstIssue, parseLb } from "@/features/lots/schemas";

import { toHHMM, type ScheduledPickup } from "./format";
import { saveScheduledSchema, type SaveScheduledInput } from "./schemas";

/** Lo que hay escrito en el formulario: todo texto, como lo entregan los campos. */
export type ScheduledFormValues = {
  collectorId: string;
  polymerCode: string;
  estimatedLb: string;
  modality: string;
  /** "0" (domingo) a "6" (sábado); "" = sin elegir. */
  weekday: string;
  startTime: string;
  endTime: string;
  notes: string;
};

export function emptyScheduledForm(collectorId = ""): ScheduledFormValues {
  return { collectorId, polymerCode: "", estimatedLb: "", modality: "venta", weekday: "", startTime: "09:00", endTime: "11:00", notes: "" };
}

export function scheduledToForm(p: ScheduledPickup): ScheduledFormValues {
  return {
    collectorId: p.collectorId,
    polymerCode: p.polymerCode,
    estimatedLb: String(p.estimatedLb),
    modality: p.modality,
    weekday: String(p.weekday),
    startTime: toHHMM(p.startTime),
    endTime: toHHMM(p.endTime),
    notes: p.notes ?? "",
  };
}

/** Convierte lo escrito en la entrada de la acción o devuelve el primer error, en español y listo para mostrar. */
export function validateScheduledForm(
  values: ScheduledFormValues,
  id?: string,
): { ok: true; input: SaveScheduledInput } | { ok: false; error: string } {
  const notes = values.notes.trim();
  const parsed = saveScheduledSchema.safeParse({
    ...(id ? { id } : {}),
    collectorId: values.collectorId,
    polymerCode: values.polymerCode,
    estimatedLb: parseLb(values.estimatedLb) ?? undefined,
    modality: values.modality,
    weekday: values.weekday === "" ? undefined : Number(values.weekday),
    startTime: values.startTime,
    endTime: values.endTime,
    ...(notes ? { notes } : {}),
  });
  return parsed.success ? { ok: true, input: parsed.data } : { ok: false, error: firstIssue(parsed.error) };
}
