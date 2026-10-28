import type { LotStatus, Modality } from "@/lib/domain/types";
import type { Database } from "@/types/database";

type RpcRow = Database["public"]["Functions"]["generator_history"]["Returns"][number];

/** Un lote del historial del comercio (lo que devuelve generator_history()), con números ya convertidos. */
export type HistoryRow = {
  lotId: string;
  pickupId: string | null;
  polymerCode: string;
  modality: Modality;
  status: LotStatus;
  estimatedLb: number;
  confirmedLb: number | null;
  totalAmount: number | null;
  /** Cuándo se publicó el lote (ISO). */
  createdAt: string;
  /** Cuándo se confirmó la entrega (ISO), si ya se confirmó. */
  completedAt: string | null;
  collectorName: string | null;
  voucherCode: string | null;
};

// PostgREST manda numeric como número, pero según la versión puede venir como texto.
const numOrNull = (value: number | string | null | undefined) => (value === null || value === undefined ? null : Number(value));

export function historyRowFromRpc(row: RpcRow): HistoryRow {
  return {
    lotId: row.lot_id,
    pickupId: row.pickup_id,
    polymerCode: row.polymer_code,
    modality: row.modality,
    status: row.status,
    estimatedLb: Number(row.estimated_lb),
    confirmedLb: numOrNull(row.confirmed_lb),
    totalAmount: numOrNull(row.total_amount),
    createdAt: row.created_at,
    completedAt: row.completed_at,
    collectorName: row.collector_name,
    voucherCode: row.voucher_code,
  };
}

const STATUS_LABEL: Record<LotStatus, string> = {
  publicado: "Esperando reciclador",
  reservado: "Reservado",
  entregado: "Por confirmar",
  completado: "Confirmado",
  cancelado: "Cancelado",
};

/** Estado corto: sirve de etiqueta en pantalla y de columna en el CSV. */
export function historyStatusLabel(status: LotStatus): string {
  return STATUS_LABEL[status];
}

/** Estado en una frase, con el nombre del reciclador cuando lo hay. */
export function historyStatusDetail(row: Pick<HistoryRow, "status" | "collectorName">): string {
  const who = row.collectorName;
  switch (row.status) {
    case "publicado":
      return "Esperando reciclador";
    case "reservado":
      return who ? `Reservado por ${who}` : "Reservado";
    case "entregado":
      return `Registraste la entrega. ${who ?? "El reciclador"} la acepta o la corrige`;
    case "completado":
      return who ? `Recogido por ${who}` : "Entrega confirmada";
    case "cancelado":
      return "Cancelado";
  }
}

const MODALITY_LABEL: Record<Modality, string> = { venta: "Venta", trueque: "Trueque", donacion: "Donación" };

export function modalityLabel(modality: Modality): string {
  return MODALITY_LABEL[modality];
}
