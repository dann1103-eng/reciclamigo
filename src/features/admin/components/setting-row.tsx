"use client";

import { LoaderCircle, TriangleAlert } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { buttonVariants } from "@/components/ui/button";
import type { Json } from "@/types/database";

import { saveSetting } from "../actions";
import { inputToSettingValue, settingToInput, type SettingKind } from "../settings-input";

import { actionButton, fieldClass } from "./styles";
import { FeedbackLine, useRunAction } from "./use-run-action";

const HINT: Record<SettingKind, string | null> = {
  number: null,
  numberList: "Radios en km separados por coma, por ejemplo 1, 3, 5.",
  optionalNumber: "Déjalo vacío para quitar el precio de referencia.",
  optionalText: "Con o sin el 503. Déjalo vacío para quitar el enlace de WhatsApp.",
};

const rangeText = (min: number | null, max: number | null) =>
  [min !== null ? `mínimo ${min}` : null, max !== null ? `máximo ${max}` : null].filter(Boolean).join(" · ");

/** Un ajuste de app_settings: su descripción, el valor guardado, el rango permitido y un campo para cambiarlo. */
export function SettingRow({
  settingKey,
  label,
  provisional,
  kind,
  savedValue,
  minValue,
  maxValue,
}: {
  settingKey: string;
  label: string;
  provisional: boolean;
  kind: SettingKind;
  savedValue: Json;
  minValue: number | null;
  maxValue: number | null;
}) {
  const id = useId();
  const saved = settingToInput(savedValue);
  const [text, setText] = useState(saved);
  const { pending, feedback, setFeedback, run } = useRunAction();

  const dirty = text.trim() !== saved;
  const range = rangeText(minValue, maxValue);
  const hint = HINT[kind];

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = inputToSettingValue(settingKey, text);
    if (!parsed.ok) return setFeedback({ kind: "error", message: parsed.error });
    run(
      () => saveSetting({ key: settingKey, raw: text }),
      "Guardado",
      // Deja en el campo la forma normalizada (14,99 pasa a 14.99) para que no quede como "sin guardar".
      () => setText(settingToInput(parsed.value)),
    );
  }

  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={id} className="font-semibold">
            {label}
          </label>
          {provisional ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-warm-soft px-2.5 py-0.5 text-xs font-semibold text-accent-warm-ink">
              <TriangleAlert className="size-3.5" aria-hidden="true" />
              Provisional: definir con el equipo
            </span>
          ) : null}
        </div>
        <p id={`${id}-meta`} className="tabular text-sm text-muted-foreground">
          Guardado: <strong className="font-semibold text-foreground">{saved === "" ? "sin valor" : saved}</strong>
          {range ? ` · ${range}` : ""}
          <span className="ml-2 font-mono text-xs">{settingKey}</span>
        </p>
        {hint ? (
          <p id={`${id}-hint`} className="text-sm text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>

      <form onSubmit={submit} className="flex flex-wrap items-start gap-2">
        <input
          id={id}
          name={settingKey}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setFeedback(null);
          }}
          inputMode={kind === "numberList" ? "text" : kind === "optionalText" ? "tel" : "decimal"}
          autoComplete="off"
          spellCheck={false}
          aria-describedby={hint ? `${id}-meta ${id}-hint` : `${id}-meta`}
          aria-invalid={feedback?.kind === "error"}
          disabled={pending}
          className={`${fieldClass} tabular w-full max-w-xs`}
        />
        <button type="submit" disabled={pending || !dirty} className={buttonVariants({ size: "lg", className: actionButton })}>
          {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
          Guardar
        </button>
      </form>

      <FeedbackLine feedback={feedback} />
    </li>
  );
}
