import { normalizeSvPhone } from "@/lib/domain/phone";
import type { Json } from "@/types/database";

// Conversión entre lo que el administrador escribe y el JSON de app_settings. Solo valida la forma
// (que sea número, lista, etc.); los rangos (mínimo y máximo) los valida la base en set_setting().

/** Tipo de campo de cada ajuste; refleja las reglas de set_setting() en la base. */
export type SettingKind = "number" | "numberList" | "optionalNumber" | "optionalText";

export function settingKind(key: string): SettingKind {
  if (key === "radios_aviso_km") return "numberList";
  if (key.startsWith("precio_ref_")) return "optionalNumber";
  if (key === "contacto_whatsapp_reciclamigo") return "optionalText";
  return "number";
}

export type ParsedSetting = { ok: true; value: Json } | { ok: false; error: string };

const fail = (error: string): ParsedSetting => ({ ok: false, error });

/** El valor guardado, como texto para el campo. */
export function settingToInput(value: Json): string {
  if (value === null) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return JSON.stringify(value);
}

const NUMBER_RE = /^-?(\d+\.?\d*|\.\d+)$/;

/** "14.99" y "14,99" son 14.99; null si no es un número (sin notación científica ni "Infinity"). */
function parseNumber(raw: string): { ok: true; value: number } | { ok: false; error: string } {
  const text = raw.replace(/\s+/g, "").replace(/^\$/, "");
  if (text === "") return { ok: false, error: "Escribe un valor" };
  // "3,650" puede ser 3650 o 3.65: no se adivina.
  if ((text.includes(",") && text.includes(".")) || /^-?\d+,\d{3}$/.test(text)) {
    return { ok: false, error: `No se entiende «${raw.trim()}». Usa punto para los decimales (0.125) y escribe los miles sin separador (3650)` };
  }
  const normalized = text.replace(",", ".");
  if (!NUMBER_RE.test(normalized)) return { ok: false, error: `«${raw.trim()}» no es un número` };
  const value = Number(normalized);
  return Number.isFinite(value) ? { ok: true, value } : { ok: false, error: `«${raw.trim()}» no es un número` };
}

/** Lo que el administrador escribió, como JSON listo para set_setting(). */
export function inputToSettingValue(key: string, raw: string): ParsedSetting {
  switch (settingKind(key)) {
    case "number": {
      const n = parseNumber(raw);
      return n.ok ? { ok: true, value: n.value } : fail(n.error);
    }

    case "optionalNumber": {
      if (raw.trim() === "") return { ok: true, value: null };
      const n = parseNumber(raw);
      return n.ok ? { ok: true, value: n.value } : fail(n.error);
    }

    case "numberList": {
      const tokens = raw.split(/[,;\s]+/).filter(Boolean);
      if (tokens.length === 0) return fail("Escribe al menos un radio en km, por ejemplo 1, 3, 5");
      const values: number[] = [];
      for (const token of tokens) {
        // Aquí la coma separa radios, así que los decimales van con punto.
        if (!NUMBER_RE.test(token) || !Number.isFinite(Number(token))) return fail(`«${token}» no es un número`);
        values.push(Number(token));
      }
      return { ok: true, value: [...new Set(values)].sort((a, b) => a - b) };
    }

    case "optionalText": {
      if (raw.trim() === "") return { ok: true, value: null };
      const phone = normalizeSvPhone(raw);
      // 8 dígitos de El Salvador (más el 503) o un número con código de país.
      if (!phone || phone.length < 11 || phone.length > 15) {
        return fail("Escribe un número de WhatsApp de 8 dígitos, o con el código de país, por ejemplo 503 7000 0000");
      }
      return { ok: true, value: phone };
    }
  }
}

const PROVISIONAL_RE = /\s*\(PROVISIONAL:[^)]*\)\s*$/;

/** Los ajustes marcados PROVISIONAL en su descripción ("definir con el equipo"). */
export function splitProvisional(description: string): { text: string; provisional: boolean } {
  return PROVISIONAL_RE.test(description)
    ? { text: description.replace(PROVISIONAL_RE, ""), provisional: true }
    : { text: description, provisional: false };
}
