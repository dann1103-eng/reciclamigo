import Link from "next/link";
import { FileCheck2 } from "lucide-react";

import { PolymerChip } from "@/components/polymer/polymer-chip";
import { RepeatLotButton } from "@/features/lots/components/repeat-lot-button";
import { formatUSD } from "@/lib/domain/format";
import type { PolymerCode } from "@/lib/domain/polymers";
import type { LotStatus } from "@/lib/domain/types";
import { formatLb } from "@/lib/domain/units";
import { cn } from "@/lib/utils";

import { historyStatusDetail, historyStatusLabel, modalityLabel, type HistoryRow } from "../history";
import { formatSvDate } from "../model";

const STATUS_STYLE: Record<LotStatus, string> = {
  publicado: "bg-paper-2 text-muted-foreground",
  reservado: "bg-accent-warm-soft text-accent-warm-ink",
  entregado: "bg-brand-soft text-brand",
  completado: "bg-brand text-brand-foreground",
  cancelado: "bg-paper-2 text-muted-foreground",
};

function HistoryItem({ row }: { row: HistoryRow }) {
  const confirmed = row.status === "completado" && row.confirmedLb !== null;
  const showTotal = confirmed && row.modality === "venta" && row.totalAmount !== null;

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <PolymerChip code={row.polymerCode as PolymerCode} />
          <span className="tabular font-bold">
            {confirmed ? formatLb(row.confirmedLb!, 2) : formatLb(row.estimatedLb, 2)}
          </span>
          <span className="text-sm text-muted-foreground">{confirmed ? "confirmadas" : "estimadas"}</span>
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLE[row.status])}>
            {historyStatusLabel(row.status)}
          </span>
        </div>
        <p className="text-sm">{historyStatusDetail(row)}</p>
        <p className="tabular text-sm text-muted-foreground">
          Publicado el {formatSvDate(row.createdAt)}
          {row.completedAt ? ` · Confirmado el ${formatSvDate(row.completedAt)}` : ""}
          {confirmed ? ` · Estimadas ${formatLb(row.estimatedLb, 2)}` : ""}
          {` · ${modalityLabel(row.modality)}`}
          {showTotal ? (
            <>
              {" · Total "}
              <span className="font-semibold text-foreground">{formatUSD(row.totalAmount!)}</span>
            </>
          ) : null}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {row.voucherCode ? (
          <Link
            href={`/comprobantes/${row.voucherCode}`}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold outline-none hover:bg-paper-2 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <FileCheck2 className="size-4" aria-hidden="true" />
            Ver comprobante
          </Link>
        ) : null}
        <RepeatLotButton lotId={row.lotId} />
      </div>
    </li>
  );
}

export function HistoryList({ rows }: { rows: HistoryRow[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <HistoryItem key={row.lotId} row={row} />
      ))}
    </ul>
  );
}
