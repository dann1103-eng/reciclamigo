"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { PolymerChip } from "@/components/polymer/polymer-chip";
import { buttonVariants } from "@/components/ui/button";
import { MAX_NOTES, parseLb } from "@/features/lots/schemas";
import { POLYMER_CODES } from "@/lib/domain/polymers";
import { formatLb } from "@/lib/domain/units";
import { cn } from "@/lib/utils";

import { saveScheduledPickup } from "../actions";
import { collectorOptionLabel, type CollectorOption } from "../collectors";
import { validateScheduledForm, type ScheduledFormValues } from "../form";

const MODALITIES = [
  { value: "venta", label: "Venta" },
  { value: "trueque", label: "Trueque" },
  { value: "donacion", label: "Donación" },
];

// Lunes primero; el valor es el de la base (0 = domingo).
const DAYS = [
  { value: "1", short: "Lun", name: "lunes" },
  { value: "2", short: "Mar", name: "martes" },
  { value: "3", short: "Mié", name: "miércoles" },
  { value: "4", short: "Jue", name: "jueves" },
  { value: "5", short: "Vie", name: "viernes" },
  { value: "6", short: "Sáb", name: "sábado" },
  { value: "0", short: "Dom", name: "domingo" },
];

const fieldClass =
  "h-12 rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40";

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-lg font-bold">{title}</legend>
      {hint ? <p className="-mt-2 text-sm text-muted-foreground">{hint}</p> : null}
      {children}
    </fieldset>
  );
}

/** Crear o editar un retiro programado. Con `id` edita: al guardar el retiro queda activo. */
export function ScheduledForm({
  initial,
  id,
  collectors,
  onClose,
  onPlanRequired,
}: {
  initial: ScheduledFormValues;
  id?: string;
  collectors: { known: CollectorOption[]; others: CollectorOption[] };
  onClose: () => void;
  /** La base respondió `requiere_plan`: la pantalla muestra el aviso con el enlace al plan. */
  onPlanRequired: (message: string) => void;
}) {
  const router = useRouter();
  const groupName = useId();
  const [values, setValues] = useState<ScheduledFormValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof ScheduledFormValues>(key: K, value: ScheduledFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const lb = parseLb(values.estimatedLb);
  const noCollectors = collectors.known.length + collectors.others.length === 0;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const check = validateScheduledForm(values, id);
    if (!check.ok) return setError(check.error);

    startTransition(async () => {
      try {
        const result = await saveScheduledPickup(check.input);
        if (!result.ok) {
          setError(result.error);
          if (result.code === "requiere_plan") onPlanRequired(result.error);
          return;
        }
        toast.success(id ? "Cambios guardados" : "Retiro programado", {
          description: "El sistema crea el lote solo y avisa primero a tu reciclador de confianza.",
        });
        onClose();
        router.refresh();
      } catch {
        setError("No se pudo guardar el retiro. Revisa la conexión e inténtalo de nuevo.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8 rounded-xl border border-border bg-card p-5 shadow-raised">
      <h2 className="text-xl font-bold">{id ? "Editar retiro programado" : "Nuevo retiro programado"}</h2>

      <Section title="¿Con qué reciclador?" hint="Es el primero en enterarse de cada lote. Los demás recicladores cercanos se enteran un poco después.">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Reciclador de confianza
          <select
            value={values.collectorId}
            onChange={(e) => set("collectorId", e.target.value)}
            disabled={noCollectors}
            className={cn(fieldClass, "w-full max-w-md font-normal")}
          >
            <option value="">{noCollectors ? "Todavía no hay recicladores" : "Elige un reciclador"}</option>
            {collectors.known.length ? (
              <optgroup label="Ya te recogieron">
                {collectors.known.map((c) => (
                  <option key={c.id} value={c.id}>
                    {collectorOptionLabel(c)}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {collectors.others.length ? (
              <optgroup label={collectors.known.length ? "Otros recicladores" : "Recicladores"}>
                {collectors.others.map((c) => (
                  <option key={c.id} value={c.id}>
                    {collectorOptionLabel(c)}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </label>
      </Section>

      <Section title="¿Qué día y a qué hora?" hint="Se repite cada semana. Hora de El Salvador.">
        <div role="radiogroup" aria-label="Día de la semana" className="flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <label key={day.value} className="relative cursor-pointer">
              <input
                type="radio"
                name={groupName}
                value={day.value}
                checked={values.weekday === day.value}
                onChange={() => set("weekday", day.value)}
                className="peer sr-only"
              />
              <span className="inline-flex h-11 min-w-14 items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold transition-colors duration-200 hover:bg-paper-2 peer-checked:border-brand peer-checked:bg-brand peer-checked:text-brand-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
                <span aria-hidden="true">{day.short}</span>
                <span className="sr-only">{day.name}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Desde
            <input type="time" step={900} value={values.startTime} onChange={(e) => set("startTime", e.target.value)} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Hasta
            <input type="time" step={900} value={values.endTime} onChange={(e) => set("endTime", e.target.value)} className={fieldClass} />
          </label>
        </div>
      </Section>

      <Section title="¿Qué plástico es?">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {POLYMER_CODES.map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={values.polymerCode === code}
              onClick={() => set("polymerCode", code)}
              className={cn(
                "rounded-xl text-left outline-none transition-shadow duration-200 focus-visible:ring-3 focus-visible:ring-ring/50",
                values.polymerCode === code && "ring-3 ring-brand ring-offset-2 ring-offset-card",
              )}
            >
              <PolymerChip code={code} size="lg" className="w-full" />
            </button>
          ))}
        </div>
      </Section>

      <Section title="¿Cuántas libras aproximadas?" hint="Es lo que se publica en cada lote. El peso real lo registras al entregar.">
        <label className="flex w-full max-w-xs items-center gap-2">
          <span className="sr-only">Libras estimadas</span>
          <input
            inputMode="decimal"
            autoComplete="off"
            placeholder="120"
            value={values.estimatedLb}
            onChange={(e) => set("estimatedLb", e.target.value)}
            aria-invalid={values.estimatedLb !== "" && lb === null}
            className={cn(fieldClass, "tabular w-full text-lg font-semibold")}
          />
          <span className="text-lg font-semibold text-muted-foreground">lb</span>
        </label>
        {lb !== null && lb >= 100 ? <p className="tabular text-sm text-muted-foreground">{formatLb(lb)}</p> : null}
      </Section>

      <Section title="¿Cómo lo entregas?">
        <div role="radiogroup" aria-label="Modalidad" className="inline-flex w-fit rounded-xl bg-paper-2 p-1">
          {MODALITIES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={values.modality === value}
              onClick={() => set("modality", value)}
              className={cn(
                "h-11 rounded-lg px-4 text-sm font-semibold outline-none transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring/50",
                values.modality === value ? "bg-card text-foreground shadow-raised" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {values.modality === "venta" ? (
          <p className="text-sm text-muted-foreground">Cada lote sale con el precio de referencia. El precio final lo registras al entregar.</p>
        ) : null}
      </Section>

      <Section title="Notas" hint="Opcional. Por ejemplo, dónde está el material o a quién preguntar.">
        <textarea
          value={values.notes}
          maxLength={MAX_NOTES}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          className="max-w-xl rounded-lg border border-input bg-card px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        <p className="tabular text-xs text-muted-foreground">
          {values.notes.length}/{MAX_NOTES}
        </p>
      </Section>

      {error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={buttonVariants({ size: "xl" })}>
          {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
          {pending ? "Guardando…" : id ? "Guardar cambios" : "Guardar retiro"}
        </button>
        <button type="button" onClick={onClose} disabled={pending} className={buttonVariants({ size: "xl", variant: "ghost" })}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
