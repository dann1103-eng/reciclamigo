import { svDateInput } from "@/features/lots/sv-time";
import { lbToKg } from "@/lib/domain/units";

import { historyStatusLabel, modalityLabel, type HistoryRow } from "./history";

const BOM = "﻿"; // Excel abre el UTF-8 con acentos solo si lo trae
const EOL = "\r\n";

const HEADERS = [
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
];

/**
 * Una celda de CSV. Entrecomilla si lleva coma, comillas o salto de línea. Un texto que empieza
 * con = + - @ lo interpretaría Excel como fórmula (los nombres los escribe cualquiera): se le
 * antepone una comilla simple para que quede como texto.
 */
export function csvCell(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const decimals = (n: number) => String(Math.round((n + Number.EPSILON) * 100) / 100);

/** Historial del comercio como CSV (UTF-8 con BOM, filas con CRLF). Las fechas van en hora de El Salvador. */
export function historyToCsv(rows: HistoryRow[]): string {
  const lines = rows.map((r) =>
    [
      svDateInput(new Date(r.createdAt)),
      r.polymerCode,
      modalityLabel(r.modality),
      historyStatusLabel(r.status),
      decimals(r.estimatedLb),
      r.confirmedLb === null ? "" : decimals(r.confirmedLb),
      r.confirmedLb === null ? "" : decimals(lbToKg(r.confirmedLb)),
      r.totalAmount === null ? "" : r.totalAmount.toFixed(2),
      r.collectorName,
      r.voucherCode,
    ]
      .map((cell) => csvCell(cell))
      .join(","),
  );
  return BOM + [HEADERS.map((h) => csvCell(h)).join(","), ...lines].join(EOL) + EOL;
}
