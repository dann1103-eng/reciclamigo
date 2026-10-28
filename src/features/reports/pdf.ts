import { PageSizes, PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

import { POLYMERS, type PolymerCode } from "@/lib/domain/polymers";

import type { ReportModel } from "./model";

// Helvetica estándar solo dibuja WinAnsi (Latin-1 + algunos signos): acentos y ñ sí; subíndices,
// emojis y alfabetos no. Todo texto pasa por sanitizeForPdf antes de medirse o dibujarse, porque
// los nombres de comercios y recicladores los escribe cualquiera y pdf-lib lanza si no puede codificarlos.

const SOLO_ASCII: Record<string, string> = { "‐": "-", "‑": "-", "−": "-", "′": "'" };

/** Deja solo lo que la fuente puede dibujar: espacios raros a espacio, sin acento si hace falta, "?" si no hay remedio. */
export function sanitizeForPdf(text: string, supported: Set<number>): string {
  let out = "";
  for (const ch of text.normalize("NFC")) {
    if (/\p{Cf}/u.test(ch)) continue; // invisibles (ancho cero, marcas de dirección)
    if (ch !== " " && /\s/u.test(ch)) {
      out += " "; // saltos de línea, tabuladores, espacios finos: WinAnsi no los codifica
      continue;
    }
    if (supported.has(ch.codePointAt(0)!)) {
      out += ch;
      continue;
    }
    // "₂" -> "2", "ő" -> "o", "ﬁ" -> "fi"
    const plain = ch.normalize("NFKD").replace(/\p{M}/gu, "");
    if (plain && [...plain].every((c) => supported.has(c.codePointAt(0)!))) {
      out += plain;
      continue;
    }
    out += SOLO_ASCII[ch] ?? "?";
  }
  return out;
}

/** Parte el texto en líneas que caben en `maxWidth` (corta las palabras que no caben solas). */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(" ").filter(Boolean)) {
    if (measure(word) > maxWidth) {
      if (current) lines.push(current);
      let chunk = "";
      for (const ch of word) {
        if (chunk && measure(chunk + ch) > maxWidth) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      current = chunk;
      continue;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const [PAGE_W, PAGE_H] = PageSizes.A4;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

const INK = rgb(0.1, 0.14, 0.12);
const SOFT = rgb(0.33, 0.38, 0.35);
const GREEN = rgb(0.1, 0.36, 0.24);
const LINE = rgb(0.82, 0.83, 0.79);
const SHADE = rgb(0.935, 0.94, 0.915);
const ZEBRA = rgb(0.972, 0.975, 0.96);

const FOOTER_SIZE = 8;
const FOOTER_LEADING = 11;
const PAGE_NUMBER_BASELINE = 30;

const ROW_H = 17;
const HEAD_H = 20;

function polymerColor(code: string) {
  const hex = POLYMERS[code as PolymerCode]?.color;
  if (!hex) return SOFT;
  const n = parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Dibuja el reporte de trazabilidad en A4 con Helvetica estándar. Sin red ni archivos. */
export async function renderReportPdf(m: ReportModel): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const supported = new Set(regular.getCharacterSet());
  const clean = (s: string) => sanitizeForPdf(s, supported);

  doc.setTitle(clean(`${m.title} - ${m.monthLabel}`), { showInWindowTitleBar: true });
  doc.setAuthor("Reciclamigo");
  doc.setCreator("Reciclamigo");
  doc.setProducer("Reciclamigo");

  const width = (s: string, font: PDFFont, size: number) => font.widthOfTextAtSize(s, size);

  /** Recorta con "..." si no cabe. */
  function fit(raw: string, font: PDFFont, size: number, maxWidth: number): string {
    const s = clean(raw);
    if (width(s, font, size) <= maxWidth) return s;
    let end = s.length;
    while (end > 0 && width(`${s.slice(0, end).trimEnd()}...`, font, size) > maxWidth) end -= 1;
    return `${s.slice(0, end).trimEnd()}...`;
  }

  function fitSize(raw: string, font: PDFFont, maxSize: number, minSize: number, maxWidth: number): number {
    const s = clean(raw);
    let size = maxSize;
    while (size > minSize && width(s, font, size) > maxWidth) size -= 0.5;
    return size;
  }

  function put(
    page: PDFPage,
    raw: string,
    x: number,
    y: number,
    o: { size: number; font?: PDFFont; color?: ReturnType<typeof rgb>; maxWidth?: number; align?: "left" | "right" },
  ) {
    const font = o.font ?? regular;
    const text = o.maxWidth ? fit(raw, font, o.size, o.maxWidth) : clean(raw);
    const left = o.align === "right" ? x - width(text, font, o.size) : x;
    page.drawText(text, { x: left, y, size: o.size, font, color: o.color ?? INK });
  }

  const rule = (page: PDFPage, y: number, color = LINE) =>
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.6, color });

  // Pie de cada página: el texto obligatorio y "Página X de Y". Se calcula antes para saber cuánto
  // espacio le queda al contenido.
  const footerLines = wrapText(clean(m.footer), CONTENT_W, (s) => width(s, regular, FOOTER_SIZE));
  const footerLastBaseline = PAGE_NUMBER_BASELINE + 18;
  const footerRuleY = footerLastBaseline + (footerLines.length - 1) * FOOTER_LEADING + FOOTER_SIZE + 6;
  const contentBottom = footerRuleY + 14;

  let page!: PDFPage;
  let y = 0;

  function startPage(first: boolean) {
    page = doc.addPage(PageSizes.A4);
    y = PAGE_H - MARGIN;
    if (first) {
      put(page, "RECICLAMIGO", MARGIN, y - 8, { size: 9, font: bold, color: GREEN });
      put(page, m.generatedLabel, PAGE_W - MARGIN, y - 8, { size: 8.5, color: SOFT, align: "right", maxWidth: 330 });
      y -= 38;
      put(page, m.title, MARGIN, y, { size: 22, font: bold });
      y -= 24;
      put(page, m.businessName, MARGIN, y, { size: 14, font: bold, maxWidth: CONTENT_W });
      y -= 17;
      put(page, `Período: ${m.monthLabel}`, MARGIN, y, { size: 11, color: SOFT });
      y -= 12;
      rule(page, y, GREEN);
      y -= 26;
    } else {
      put(page, `${m.title} - ${m.monthLabel}`, MARGIN, y - 8, { size: 9.5, font: bold, color: GREEN });
      put(page, m.businessName, PAGE_W - MARGIN, y - 8, { size: 9, color: SOFT, align: "right", maxWidth: 240 });
      y -= 18;
      rule(page, y);
      y -= 22;
    }
  }

  /** Si no cabe `height`, pasa a otra página. Devuelve true si cambió de página. */
  function ensure(height: number): boolean {
    if (y - height >= contentBottom) return false;
    startPage(false);
    return true;
  }

  function sectionHeading(text: string) {
    put(page, text, MARGIN, y, { size: 12, font: bold });
    y -= 10;
  }

  function tableHeader(cols: { label: string; x: number; width: number }[]) {
    page.drawRectangle({ x: MARGIN, y: y - HEAD_H, width: CONTENT_W, height: HEAD_H, color: SHADE });
    for (const c of cols) {
      put(page, c.label, MARGIN + c.x + 6, y - HEAD_H + 7, { size: 8.5, font: bold, color: SOFT, maxWidth: c.width - 10 });
    }
    y -= HEAD_H;
  }

  startPage(true);

  if (m.emptyMessage) {
    page.drawRectangle({ x: MARGIN, y: y - 46, width: CONTENT_W, height: 52, borderColor: LINE, borderWidth: 0.8, color: ZEBRA });
    put(page, m.emptyMessage, MARGIN + 16, y - 24, { size: 12, font: bold, maxWidth: CONTENT_W - 32 });
  } else {
    // Resumen por tipo de plástico
    const sumCols = [
      { label: m.summaryColumns.polymer, x: 0, width: 260 },
      { label: m.summaryColumns.weight, x: 260, width: 160 },
      { label: m.summaryColumns.deliveries, x: 420, width: CONTENT_W - 420 },
    ];
    ensure(40 + HEAD_H + ROW_H * Math.min(m.summary.length, 2));
    sectionHeading(m.summaryHeading);
    tableHeader(sumCols);
    m.summary.forEach((line, i) => {
      if (ensure(ROW_H + 4)) {
        sectionHeading(`${m.summaryHeading} (continuación)`);
        tableHeader(sumCols);
      }
      const base = y - ROW_H + 5.5;
      if (i % 2 === 1) page.drawRectangle({ x: MARGIN, y: y - ROW_H, width: CONTENT_W, height: ROW_H, color: ZEBRA });
      page.drawCircle({ x: MARGIN + 12, y: base + 3, size: 3.6, color: polymerColor(line.polymerCode) });
      put(page, line.polymerCode, MARGIN + 22, base, { size: 9, font: bold, maxWidth: 50 });
      put(page, line.polymerName, MARGIN + 60, base, { size: 9, color: SOFT, maxWidth: 196 });
      put(page, line.weightLabel, MARGIN + 266, base, { size: 9, maxWidth: 150 });
      put(page, line.deliveriesLabel, MARGIN + 426, base, { size: 9, maxWidth: CONTENT_W - 430 });
      y -= ROW_H;
    });
    rule(page, y);
    y -= 24;

    // Totales del mes
    ensure(86);
    sectionHeading(m.totalsHeading);
    y -= 6;
    const boxW = (CONTENT_W - 16) / 3;
    const stats = [
      { label: m.totalLabels.weight, value: m.totals.weightLabel },
      { label: m.totalLabels.deliveries, value: m.totals.deliveriesLabel },
      { label: m.totalLabels.co2, value: m.totals.co2Label },
    ];
    stats.forEach((s, i) => {
      const x = MARGIN + i * (boxW + 8);
      page.drawRectangle({ x, y: y - 44, width: boxW, height: 50, borderColor: LINE, borderWidth: 0.8, color: ZEBRA });
      put(page, s.label, x + 10, y - 8, { size: 8.5, color: SOFT, maxWidth: boxW - 20 });
      const size = fitSize(s.value, bold, 14, 9, boxW - 20);
      put(page, s.value, x + 10, y - 31, { size, font: bold });
    });
    y -= 62;
    put(page, m.co2Note, MARGIN, y, { size: 8, color: SOFT, maxWidth: CONTENT_W });
    y -= 30;

    // Lista de comprobantes
    const c = m.voucherColumns;
    const cols = [
      { label: c.date, x: 0, width: 62 },
      { label: c.collector, x: 62, width: 150 },
      { label: c.polymer, x: 212, width: 52 },
      { label: c.weight, x: 264, width: 130 },
      { label: c.code, x: 394, width: CONTENT_W - 394 },
    ];
    ensure(40 + HEAD_H + ROW_H * 2);
    sectionHeading(`${m.vouchersHeading} (${m.totals.deliveriesLabel})`);
    tableHeader(cols);
    m.vouchers.forEach((v, i) => {
      if (ensure(ROW_H + 4)) {
        sectionHeading(`${m.vouchersHeading} (continuación)`);
        tableHeader(cols);
      }
      const base = y - ROW_H + 5.5;
      if (i % 2 === 1) page.drawRectangle({ x: MARGIN, y: y - ROW_H, width: CONTENT_W, height: ROW_H, color: ZEBRA });
      put(page, v.dateLabel, MARGIN + 6, base, { size: 8.5, maxWidth: 54 });
      put(page, v.collectorName, MARGIN + 68, base, { size: 8.5, maxWidth: 140 });
      page.drawCircle({ x: MARGIN + 218, y: base + 2.8, size: 3, color: polymerColor(v.polymerCode) });
      put(page, v.polymerCode, MARGIN + 225, base, { size: 8.5, font: bold, maxWidth: 38 });
      put(page, v.weightLabel, MARGIN + 270, base, { size: 8.5, maxWidth: 120 });
      put(page, v.code, MARGIN + 400, base, { size: 8.5, maxWidth: CONTENT_W - 404 });
      y -= ROW_H;
    });
    rule(page, y);
  }

  // Pie con el texto obligatorio y "Página X de Y" en cada página.
  const pages = doc.getPages();
  pages.forEach((p, index) => {
    rule(p, footerRuleY);
    footerLines.forEach((line, k) => {
      const baseline = footerLastBaseline + (footerLines.length - 1 - k) * FOOTER_LEADING;
      p.drawText(line, { x: MARGIN, y: baseline, size: FOOTER_SIZE, font: regular, color: SOFT });
    });
    put(p, "Reciclamigo", MARGIN, PAGE_NUMBER_BASELINE, { size: 8, font: bold, color: GREEN });
    put(p, `Página ${index + 1} de ${pages.length}`, PAGE_W - MARGIN, PAGE_NUMBER_BASELINE, { size: 8, color: SOFT, align: "right" });
  });

  return doc.save();
}
