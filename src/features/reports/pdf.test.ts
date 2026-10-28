import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream, type PDFPage } from "pdf-lib";
import { describe, expect, test } from "vitest";

import { buildReportModel, REPORT_FOOTER, type ReportRow } from "./model";
import { renderReportPdf, sanitizeForPdf, wrapText } from "./pdf";

const POLYMER_CYCLE = ["PET", "HDPE", "LDPE", "PP", "PS"];

function makeRows(n: number): ReportRow[] {
  return Array.from({ length: n }, (_, i) => ({
    voucherCode: `RCA-2026-${String(i).padStart(6, "0")}`,
    completedAt: new Date(Date.UTC(2026, 9, 1 + (i % 28), 15, 0)).toISOString(),
    collectorName: `Reciclador número ${i}`,
    polymerCode: POLYMER_CYCLE[i % POLYMER_CYCLE.length],
    confirmedLb: 20 + (i % 7) * 12.5,
  }));
}

const model = (rows: ReportRow[], businessName = "Restaurante El Maíz") =>
  buildReportModel({ businessName, month: "2026-10", rows, co2Factor: 2, generatedAt: new Date("2026-10-28T20:05:00Z") });

/** Texto dibujado en la página (las cadenas del PDF van en hexadecimal, en WinAnsi ≈ Latin-1). */
function pageText(doc: PDFDocument, page: PDFPage): string {
  const contents = page.node.Contents();
  const streams = contents instanceof PDFArray ? contents.asArray().map((ref) => doc.context.lookup(ref)) : [contents];
  const chunks: string[] = [];
  for (const stream of streams) {
    const ops = Buffer.from(decodePDFRawStream(stream as PDFRawStream).decode()).toString("latin1");
    for (const match of ops.matchAll(/<([0-9A-Fa-f]*)>\s*Tj/g)) {
      chunks.push(Buffer.from(match[1], "hex").toString("latin1"));
    }
  }
  return chunks.join(" ");
}

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

describe("renderReportPdf", () => {
  test("genera un PDF A4 válido que empieza con %PDF", async () => {
    const bytes = await renderReportPdf(model(makeRows(5)));
    expect(Buffer.from(bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(595.28, 1);
    expect(height).toBeCloseTo(841.89, 1);
  });

  test("con 120 filas pagina bien: varias páginas, ninguna fila perdida ni repetida", async () => {
    const rows = makeRows(120);
    const doc = await PDFDocument.load(await renderReportPdf(model(rows)));
    const pages = doc.getPages();
    expect(pages.length).toBeGreaterThan(2);

    const all = pages.map((p) => pageText(doc, p));
    for (const row of rows) {
      const hits = all.filter((text) => text.includes(row.voucherCode)).length;
      expect(hits, row.voucherCode).toBe(1);
    }
  });

  test("cada página repite el encabezado y lleva el pie obligatorio y 'Página X de Y'", async () => {
    const doc = await PDFDocument.load(await renderReportPdf(model(makeRows(120))));
    const total = doc.getPageCount();
    doc.getPages().forEach((page, i) => {
      const text = squash(pageText(doc, page));
      expect(text, `página ${i + 1}`).toContain("Reporte de trazabilidad");
      expect(text, `página ${i + 1}`).toContain("octubre de 2026");
      expect(text, `página ${i + 1}`).toContain(`Página ${i + 1} de ${total}`);
      expect(text, `página ${i + 1}`).toContain(REPORT_FOOTER);
      // Encabezado de la tabla de comprobantes (las páginas siguientes a la primera lo repiten)
      expect(text, `página ${i + 1}`).toContain("Peso confirmado");
    });
  });

  test("la primera página trae el negocio, el resumen y los totales", async () => {
    const doc = await PDFDocument.load(await renderReportPdf(model(makeRows(8))));
    const text = squash(pageText(doc, doc.getPage(0)));
    expect(text).toContain("Restaurante El Maíz");
    expect(text).toContain("Resumen por tipo de plástico");
    expect(text).toContain("Totales del mes");
    expect(text).toContain("CO2 evitado");
    expect(text).toContain("Tereftalato de polietileno");
  });

  test("un mes sin entregas da un PDF válido que lo dice", async () => {
    const doc = await PDFDocument.load(await renderReportPdf(model([])));
    expect(doc.getPageCount()).toBe(1);
    const text = squash(pageText(doc, doc.getPage(0)));
    expect(text).toContain("No hay entregas confirmadas en octubre de 2026.");
    expect(text).toContain(REPORT_FOOTER);
  });

  test("no se rompe con caracteres que la fuente estándar no dibuja", async () => {
    const rows: ReportRow[] = [
      { ...makeRows(1)[0], collectorName: "Ana 🌎 Pérez\nLópez ₂ 田中", voucherCode: "RCA-2026-EMOJI1" },
    ];
    const bytes = await renderReportPdf(model(rows, "Café «El Ñandú» 🍕 — S.A. de C.V."));
    const doc = await PDFDocument.load(bytes);
    const text = squash(pageText(doc, doc.getPage(0)));
    expect(text).toContain("Café");
    expect(text).toContain("Pérez López");
    expect(text).toContain("RCA-2026-EMOJI1");
  });

  test("nombres larguísimos no desbordan ni rompen", async () => {
    const long = "Comercializadora Internacional de Productos Alimenticios y Bebidas ".repeat(6);
    const rows = [{ ...makeRows(1)[0], collectorName: long }];
    const doc = await PDFDocument.load(await renderReportPdf(model(rows, long)));
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  test("el título del documento lleva el mes", async () => {
    const doc = await PDFDocument.load(await renderReportPdf(model(makeRows(2))));
    expect(doc.getTitle()).toBe("Reporte de trazabilidad - octubre de 2026");
  });
});

describe("sanitizeForPdf", () => {
  const supported = new Set<number>([..." abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-?.,éñÑáí"].map((c) => c.codePointAt(0)!));

  test("deja pasar lo que la fuente dibuja", () => {
    expect(sanitizeForPdf("Peña, José", supported)).toBe("Peña, José");
  });

  test("convierte espacios raros y saltos de línea en espacios", () => {
    expect(sanitizeForPdf("a\nb\tc d e", supported)).toBe("a b c d e");
  });

  test("quita marcas invisibles y reemplaza lo que no se puede dibujar por ?", () => {
    expect(sanitizeForPdf("a​b🌎c", supported)).toBe("ab?c");
  });

  test("intenta quitar el acento antes de rendirse", () => {
    expect(sanitizeForPdf("ö", supported)).toBe("o");
    expect(sanitizeForPdf("ő", supported)).toBe("o");
    expect(sanitizeForPdf("đ", supported)).toBe("?");
  });

  test("el subíndice de CO2 se vuelve un 2 normal", () => {
    expect(sanitizeForPdf("CO₂", supported)).toBe("CO2");
  });
});

describe("wrapText", () => {
  // Cada carácter mide 1: el ancho máximo es el número de caracteres por línea.
  const measure = (s: string) => s.length;

  test("parte en espacios y unir las líneas con espacio devuelve el texto original", () => {
    const text = "Este reporte documenta las entregas registradas en Reciclamigo y puede respaldar";
    const lines = wrapText(text, 20, measure);
    expect(lines.length).toBeGreaterThan(3);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(20);
    expect(lines.join(" ")).toBe(text);
  });

  test("una palabra más ancha que la línea se corta en vez de desbordar", () => {
    const lines = wrapText("a supercalifragilistico b", 8, measure);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(8);
    expect(lines.join("").replace(/ /g, "")).toBe("asupercalifragilisticob");
  });

  test("texto vacío no da líneas", () => {
    expect(wrapText("", 10, measure)).toEqual([]);
  });
});
