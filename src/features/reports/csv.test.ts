import { describe, expect, test } from "vitest";

import { csvCell, historyToCsv } from "./csv";
import type { HistoryRow } from "./history";

const row: HistoryRow = {
  lotId: "lot-1",
  pickupId: "pk-1",
  polymerCode: "PET",
  modality: "venta",
  status: "completado",
  estimatedLb: 120,
  confirmedLb: 95.5,
  totalAmount: 12.34,
  createdAt: "2026-10-03T15:00:00Z",
  completedAt: "2026-10-05T16:00:00Z",
  collectorName: "Don José",
  voucherCode: "RCA-2026-AAA111",
};

/** Lector mínimo de CSV (RFC 4180) para comprobar que lo escrito se puede leer de vuelta. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cell = "";
  let line: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      line.push(cell);
      cell = "";
    } else if (ch === "\r" && text[i + 1] === "\n") {
      line.push(cell);
      rows.push(line);
      line = [];
      cell = "";
      i++;
    } else cell += ch;
  }
  if (cell || line.length) {
    line.push(cell);
    rows.push(line);
  }
  return rows;
}

describe("csvCell", () => {
  test("deja igual lo simple", () => {
    expect(csvCell("PET")).toBe("PET");
    expect(csvCell("Don José")).toBe("Don José");
  });

  test("entrecomilla comas, comillas y saltos de línea, y duplica las comillas", () => {
    expect(csvCell("Pérez, José")).toBe('"Pérez, José"');
    expect(csvCell('Dijo "hola"')).toBe('"Dijo ""hola"""');
    expect(csvCell("a\nb")).toBe('"a\nb"');
    expect(csvCell("a\r\nb")).toBe('"a\r\nb"');
  });

  test("nulos y vacíos quedan como celda vacía", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell("")).toBe("");
  });

  test("un texto que empieza como fórmula no se ejecuta en Excel", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe("\"'=HYPERLINK(\"\"http://x\"\")\"");
    expect(csvCell("+503 7000 0000")).toBe("'+503 7000 0000");
    expect(csvCell("-cmd")).toBe("'-cmd");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });
});

describe("historyToCsv", () => {
  test("empieza con BOM UTF-8 y la fila de encabezados", () => {
    const csv = historyToCsv([row]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const [header] = parseCsv(csv.slice(1));
    expect(header).toEqual([
      "Fecha",
      "Tipo de plástico",
      "Modalidad",
      "Estado",
      "Libras estimadas",
      "Libras confirmadas",
      "Kg confirmados",
      "Total USD",
      "Reciclador",
      "Comprobante",
    ]);
  });

  test("escribe una fila de datos: fecha en hora de El Salvador, libras, kg, total, reciclador y comprobante", () => {
    const [, data] = parseCsv(historyToCsv([row]).slice(1));
    expect(data).toEqual(["2026-10-03", "PET", "Venta", "Confirmado", "120", "95.5", "43.32", "12.34", "Don José", "RCA-2026-AAA111"]);
  });

  test("la fecha es la de El Salvador (UTC-6)", () => {
    const [, data] = parseCsv(historyToCsv([{ ...row, createdAt: "2026-11-01T05:30:00Z" }]).slice(1));
    expect(data[0]).toBe("2026-10-31");
  });

  test("lo que no existe todavía queda vacío", () => {
    const pending: HistoryRow = {
      ...row,
      pickupId: null,
      status: "publicado",
      confirmedLb: null,
      totalAmount: null,
      completedAt: null,
      collectorName: null,
      voucherCode: null,
      modality: "donacion",
    };
    const [, data] = parseCsv(historyToCsv([pending]).slice(1));
    expect(data).toEqual(["2026-10-03", "PET", "Donación", "Esperando reciclador", "120", "", "", "", "", ""]);
  });

  test("nombres con coma, comillas y salto de línea se leen de vuelta tal cual", () => {
    const tricky = { ...row, collectorName: 'Cooperativa "La Unión", Santa Ana\nBodega 2' };
    const rows = parseCsv(historyToCsv([tricky]).slice(1));
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveLength(10);
    expect(rows[1][8]).toBe('Cooperativa "La Unión", Santa Ana\nBodega 2');
  });

  test("filas separadas por CRLF y una por lote, en el orden recibido", () => {
    const csv = historyToCsv([row, { ...row, lotId: "lot-2", createdAt: "2026-10-02T15:00:00Z" }]);
    expect(csv.endsWith("\r\n")).toBe(true);
    const rows = parseCsv(csv.slice(1));
    expect(rows).toHaveLength(3);
    expect(rows[1][0]).toBe("2026-10-03");
    expect(rows[2][0]).toBe("2026-10-02");
  });

  test("sin lotes solo trae los encabezados", () => {
    expect(parseCsv(historyToCsv([]).slice(1))).toHaveLength(1);
  });

  test("los decimales no arrastran errores de punto flotante", () => {
    const [, data] = parseCsv(historyToCsv([{ ...row, estimatedLb: 0.1 + 0.2, confirmedLb: 1 / 3, totalAmount: 0.1 + 0.2 }]).slice(1));
    expect(data[4]).toBe("0.3");
    expect(data[5]).toBe("0.33");
    expect(data[7]).toBe("0.30");
  });
});
