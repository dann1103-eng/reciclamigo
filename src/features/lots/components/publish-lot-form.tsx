"use client";

import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { PolymerChip } from "@/components/polymer/polymer-chip";
import { buttonVariants } from "@/components/ui/button";
import { LimitNotice } from "@/features/plans/components/limit-notice";
import { formatPricePerLb, formatUSD } from "@/lib/domain/format";
import { POLYMER_CODES, POLYMERS, type PolymerCode } from "@/lib/domain/polymers";
import { suggestedTotal } from "@/lib/domain/pricing";
import type { Modality } from "@/lib/domain/types";
import { formatLb } from "@/lib/domain/units";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { publishLot } from "../actions";
import { firstIssue, MAX_NOTES, parseLb, publishLotSchema } from "../schemas";
import { svDateInput, svDateTimeToIso } from "../sv-time";
import { MAX_PHOTOS, removeLotPhotos, supabasePhotoStorage, uploadLotPhotos, validatePhotoFiles } from "../upload";

const MODALITIES: { value: Modality; label: string }[] = [
  { value: "venta", label: "Venta" },
  { value: "trueque", label: "Trueque" },
  { value: "donacion", label: "Donación" },
];

const fieldClass =
  "h-12 rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      {/* legend no participa del gap del fieldset: su margen va aparte */}
      <legend className="mb-3 text-lg font-bold">{title}</legend>
      {hint ? <p className="-mt-2 text-sm text-muted-foreground">{hint}</p> : null}
      {children}
    </fieldset>
  );
}

export function PublishLotForm({
  userId,
  prices,
  freeLotsLeft,
  freeLimit,
  planPriceUsd,
}: {
  userId: string;
  /** Precio de referencia por libra de cada plástico (null = sin referencia). Viene de la configuración. */
  prices: Record<PolymerCode, number | null>;
  /** Lotes gratis que le quedan este mes; null = ilimitados (plan activo). */
  freeLotsLeft: number | null;
  freeLimit: number | null;
  planPriceUsd: number;
}) {
  const router = useRouter();
  const [polymer, setPolymer] = useState<PolymerCode | null>(null);
  const [lbRaw, setLbRaw] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [date, setDate] = useState(() => svDateInput(new Date(), 1));
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("11:00");
  const [modality, setModality] = useState<Modality>("venta");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const lb = parseLb(lbRaw);
  const refPrice = polymer ? (prices[polymer] ?? null) : null;
  const total = polymer && lb && refPrice ? suggestedTotal(lb, refPrice, modality) : 0;
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files, ...Array.from(list)];
    const problem = validatePhotoFiles(next);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setFiles(next);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLimitHit(false);
    if (!polymer) return setError("Elige el tipo de plástico");
    if (lb === null) return setError("Escribe las libras aproximadas, por ejemplo 90 o 85,5");
    const photoProblem = validatePhotoFiles(files);
    if (photoProblem) return setError(photoProblem);
    const pickupFrom = svDateTimeToIso(date, from);
    const pickupTo = svDateTimeToIso(date, to);
    if (!pickupFrom || !pickupTo) return setError("Elige el día y las horas de retiro");

    const input = {
      polymerCode: polymer,
      estimatedLb: lb,
      pickupFrom,
      pickupTo,
      modality,
      photoUrls: [] as string[],
      notes: notes.trim() || undefined,
    };
    // Valida todo antes de subir fotos, para no dejar archivos huérfanos.
    const precheck = publishLotSchema.safeParse(input);
    if (!precheck.success) return setError(firstIssue(precheck.error));

    setSubmitting(true);
    try {
      const storage = supabasePhotoStorage(createClient());
      const photoUrls = await uploadLotPhotos(storage, userId, files);
      const result = await publishLot({ ...input, photoUrls });
      if (!result.ok) {
        await removeLotPhotos(storage, photoUrls).catch(() => {}); // no dejar fotos de un lote que no existe
        setError(result.error);
        setLimitHit(result.code === "limite_gratis");
        setSubmitting(false);
        return;
      }
      toast.success("Lote publicado", { description: "Ya aparece en el mapa de los recicladores cercanos." });
      router.push("/comercio");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error && err.message.startsWith("No se pudo") ? err.message : "No se pudo publicar el lote. Revisa la conexión e inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="flex flex-col gap-10">
        <Section title="¿Qué plástico es?">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {POLYMER_CODES.map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={polymer === code}
                onClick={() => setPolymer(code)}
                className={cn(
                  "rounded-xl text-left outline-none transition-shadow duration-200 focus-visible:ring-3 focus-visible:ring-ring/50",
                  polymer === code && "ring-3 ring-brand ring-offset-2 ring-offset-background",
                )}
              >
                <PolymerChip code={code} size="lg" className="w-full" />
              </button>
            ))}
          </div>
        </Section>

        <Section title="¿Cuántas libras aproximadas?" hint="El peso real lo registras al entregar y el reciclador lo acepta o lo corrige.">
          <label className="flex w-full max-w-xs items-center gap-2">
            <span className="sr-only">Libras estimadas</span>
            <input
              inputMode="decimal"
              autoComplete="off"
              placeholder="90"
              value={lbRaw}
              onChange={(e) => setLbRaw(e.target.value)}
              aria-invalid={lbRaw !== "" && lb === null}
              className={cn(fieldClass, "tabular w-full text-lg font-semibold")}
            />
            <span className="text-lg font-semibold text-muted-foreground">lb</span>
          </label>
          {lb !== null && lb >= 100 ? <p className="tabular text-sm text-muted-foreground">{formatLb(lb)}</p> : null}
        </Section>

        <Section title="Fotos" hint={`Opcional, hasta ${MAX_PHOTOS}. Ayudan a que el reciclador sepa qué va a recoger.`}>
          <div className="flex flex-wrap gap-3">
            {previews.map((url, i) => (
              <div key={url} className="relative size-24 overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
                <img src={url} alt={`Foto ${i + 1} del lote`} className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-card/95 text-foreground shadow-raised outline-none before:absolute before:-inset-2 before:content-[''] focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <X className="size-4" aria-hidden="true" />
                  <span className="sr-only">Quitar foto {i + 1}</span>
                </button>
              </div>
            ))}
            {files.length < MAX_PHOTOS ? (
              <label className="grid size-24 cursor-pointer place-items-center rounded-lg border border-dashed border-input text-muted-foreground transition-colors duration-200 hover:border-brand hover:text-brand has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
                <span className="flex flex-col items-center gap-1 text-xs font-semibold">
                  <ImagePlus className="size-6" aria-hidden="true" />
                  Agregar
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            ) : null}
          </div>
        </Section>

        <Section title="¿Cuándo pueden pasar?" hint="Hora de El Salvador.">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Día
              <input
                type="date"
                value={date}
                min={svDateInput(new Date())}
                onChange={(e) => setDate(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Desde
              <input type="time" step={1800} value={from} onChange={(e) => setFrom(e.target.value)} className={fieldClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Hasta
              <input type="time" step={1800} value={to} onChange={(e) => setTo(e.target.value)} className={fieldClass} />
            </label>
          </div>
        </Section>

        <Section title="¿Cómo lo entregas?">
          <div role="radiogroup" aria-label="Modalidad" className="inline-flex w-fit rounded-xl bg-paper-2 p-1">
            {MODALITIES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={modality === value}
                onClick={() => setModality(value)}
                className={cn(
                  "h-11 rounded-lg px-4 text-sm font-semibold outline-none transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring/50",
                  modality === value ? "bg-card text-foreground shadow-raised" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {modality === "venta"
              ? polymer
                ? refPrice
                  ? `Precio de referencia: ${formatPricePerLb(refPrice)} de ${polymer}.`
                  : `El ${polymer} no tiene precio de referencia: lo acuerdas con el reciclador.`
                : "El precio de referencia depende del tipo de plástico."
              : modality === "trueque"
                ? "Acuerdan el intercambio directamente con el reciclador."
                : "Lo entregas sin costo y igual cuenta para tu impacto."}
          </p>
        </Section>

        <Section title="Notas" hint="Opcional. Por ejemplo, dónde está el material o a quién preguntar.">
          <textarea
            value={notes}
            maxLength={MAX_NOTES}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="max-w-xl rounded-lg border border-input bg-card px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          />
          <p className="tabular text-xs text-muted-foreground">
            {notes.length}/{MAX_NOTES}
          </p>
        </Section>
      </div>

      <aside className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-raised lg:sticky lg:top-24">
        <h2 className="text-sm font-semibold text-muted-foreground">Resumen</h2>
        <div className="flex min-h-7 flex-wrap items-center gap-2">
          {polymer ? <PolymerChip code={polymer} /> : <span className="text-sm text-muted-foreground">Sin plástico elegido</span>}
          {lb ? <span className="tabular text-sm font-semibold">{formatLb(lb)}</span> : null}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{modality === "venta" ? (refPrice ? "Total sugerido" : "Sin precio de referencia") : "Sin cobro"}</p>
          <p className="tabular text-4xl font-extrabold tracking-tight">{formatUSD(total)}</p>
          {polymer ? <p className="text-xs text-muted-foreground">{POLYMERS[polymer].name}</p> : null}
        </div>
        {freeLotsLeft !== null ? (
          <p className="text-sm text-muted-foreground">
            {freeLotsLeft > 0
              ? `${freeLotsLeft === 1 ? "Te queda 1 lote gratis" : `Te quedan ${freeLotsLeft} lotes gratis`} este mes${freeLimit ? ` (de ${freeLimit})` : ""}.`
              : "Ya usaste tus lotes gratis de este mes."}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Lotes ilimitados con tu Plan Trazabilidad.</p>
        )}
        {limitHit && freeLimit ? <LimitNotice limit={freeLimit} priceUsd={planPriceUsd} /> : null}
        {error && !(limitHit && freeLimit) ? (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={submitting} className={buttonVariants({ size: "xl", className: "w-full" })}>
          {submitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
          {submitting ? "Publicando…" : "Publicar lote"}
        </button>
      </aside>
    </form>
  );
}
