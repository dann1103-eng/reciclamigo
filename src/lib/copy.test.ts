import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

// Guardia de lenguaje (sección 7 y 10 del documento de cambios): en la app visible nunca debe
// aparecer "certificado", "certifica…" ni una promesa de cumplir la Ley ANDRES. Única excepción:
// el pie obligatorio del reporte de trazabilidad, que lo niega ("ni un certificado emitido por una autoridad").
// También se vigilan los textos de planes viejos, de la API para empresas y del bot de WhatsApp.

const SRC = join(process.cwd(), "src");
const REPORT_FOOTER =
  "Este reporte documenta las entregas registradas en Reciclamigo y puede respaldar la gestión de residuos de la empresa. No es un permiso ni un certificado emitido por una autoridad.";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|css)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

// database.ts es el espejo de la base de datos: ahí viven nombres técnicos, no textos de la interfaz.
const files = sourceFiles(SRC).filter((f) => !f.endsWith(join("types", "database.ts")));

function offences(pattern: RegExp): string[] {
  return files.flatMap((file) => {
    const text = readFileSync(file, "utf8").split(REPORT_FOOTER).join("");
    const lines = text.split("\n");
    return lines.flatMap((line, i) => (pattern.test(line) ? [`${file.replace(SRC, "src")}:${i + 1}: ${line.trim()}`] : []));
  });
}

describe("lenguaje de la app", () => {
  test("no usa «certificado», «certifica…» ni promete cumplir la Ley ANDRES", () => {
    expect(offences(/certificad|certifica|\bANDRES\b/i)).toEqual([]);
  });

  test("no quedan planes viejos, API para empresas ni bot de WhatsApp", () => {
    expect(offences(/\b(plan\s+)?(b[aá]sico|premium|corporativo)\b|api\s+para\s+empresas|bot\s+de\s+whatsapp|chatbot/i)).toEqual([]);
  });

  test("ningún peso se muestra en kilos fuera de CO₂ y de los reportes (formatKg solo lo usan unidades y comprobantes)", () => {
    const users = files.filter((f) => /formatKg\b/.test(readFileSync(f, "utf8"))).map((f) => f.replace(SRC, "src"));
    const allowed = ["src\\lib\\domain\\units.ts", "src/lib/domain/units.ts", "src\\features\\vouchers\\components\\voucher.tsx", "src/features/vouchers/components/voucher.tsx"];
    expect(users.filter((f) => !allowed.includes(f))).toEqual([]);
  });
});
