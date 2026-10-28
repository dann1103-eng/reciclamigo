import { MessageCircle } from "lucide-react";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { getSettings } from "@/lib/settings/load";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { describeEntry, formatPoints, monthlyRoom, upcomingExpirations, type LedgerKind } from "../ledger";
import { fetchPoints, HISTORY_LIMIT } from "../queries";
import { redeemLink, redeemMessage } from "../redeem";

const shortDate = new Intl.DateTimeFormat("es-SV", {
  timeZone: "America/El_Salvador",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const longDate = new Intl.DateTimeFormat("es-SV", { timeZone: "America/El_Salvador", dateStyle: "long" });

const CHIP: Record<LedgerKind, string> = {
  ganado: "bg-brand-soft text-brand",
  canje: "bg-paper-3 text-foreground",
  ajuste: "bg-paper-2 text-muted-foreground",
};

const pointsWord = (n: number) => (n === 1 ? "punto" : "puntos");

function Card({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-xl border border-border bg-card px-5 py-5">
      <h2 id={id} className="text-lg font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Saldo, tope del mes, próximas caducidades e historial de ReciclaPuntos de un perfil. */
export async function PointsPanel({ profileId }: { profileId: string }) {
  const supabase = await createClient();
  const now = new Date();
  const [data, settings] = await Promise.all([fetchPoints(supabase, profileId, now), getSettings()]);

  const cap = settings.pointsMonthlyCap;
  const room = monthlyRoom(cap, data.earnedThisMonth);
  const expirations = upcomingExpirations(data.active, now);
  const percent = cap === null ? 0 : cap > 0 ? Math.min(100, (data.earnedThisMonth / cap) * 100) : 100;

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="saldo"
        className="flex flex-col gap-4 rounded-xl border border-border bg-card px-5 py-5 shadow-raised"
      >
        <h2 id="saldo" className="text-sm font-semibold text-muted-foreground">
          Tu saldo
        </h2>
        <p className="flex items-baseline gap-2">
          <span className="tabular text-5xl font-extrabold tracking-tight text-brand">{formatPoints(data.balance)}</span>
          <span className="text-lg font-semibold">{pointsWord(data.balance)}</span>
        </p>
        <p className="max-w-[60ch] text-sm">
          Se ganan solo con entregas confirmadas. El canje es manual por ahora: escríbenos y el equipo lo registra.
        </p>
        {settings.contactWhatsapp && data.balance > 0 ? (
          <a
            href={redeemLink(settings.contactWhatsapp, redeemMessage({ name: data.displayName || "un usuario", balance: data.balance }))}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ size: "xl", className: "w-fit" })}
          >
            <MessageCircle aria-hidden="true" />
            Pedir un canje por WhatsApp
            <span className="sr-only"> (se abre en una pestaña nueva)</span>
          </a>
        ) : null}
      </section>

      <Card id="este-mes" title="Este mes">
        <p>
          Ganaste <strong className="tabular">{formatPoints(data.earnedThisMonth)}</strong>
          {cap === null ? ` ${pointsWord(data.earnedThisMonth)}.` : ` de ${formatPoints(cap)} puntos.`}
        </p>
        {cap !== null ? (
          <>
            <div
              role="progressbar"
              aria-label="Puntos ganados este mes"
              aria-valuemin={0}
              aria-valuemax={cap}
              aria-valuenow={Math.min(data.earnedThisMonth, cap)}
              className="h-2.5 overflow-hidden rounded-full bg-paper-3"
            >
              <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-sm text-muted-foreground">
              {room === 0
                ? "Llegaste al tope de este mes: las entregas que confirmes hasta fin de mes ya no suman puntos. El tope se reinicia el día 1."
                : `Te quedan ${formatPoints(room ?? 0)} ${pointsWord(room ?? 0)} por ganar este mes. El tope se reinicia el día 1.`}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Este mes no hay tope de puntos.</p>
        )}
        <p className="text-sm text-muted-foreground">
          Cada punto caduca {settings.pointsExpiryDays} días después de ganarlo.
        </p>
      </Card>

      <Card id="caducidades" title="Próximas caducidades">
        {expirations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tienes puntos por caducar.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {expirations.map((x) => (
              <li key={x.day} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2.5 first:pt-0 last:pb-0">
                <span className="font-semibold">{longDate.format(new Date(x.expiresAt))}</span>
                <span className="tabular text-sm">
                  {formatPoints(x.points)} {pointsWord(x.points)}
                  <span className="text-muted-foreground"> · {x.daysLeft === 1 ? "queda 1 día" : `quedan ${x.daysLeft} días`}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <section aria-labelledby="historial" className="flex flex-col gap-3">
        <h2 id="historial" className="text-lg font-bold">
          Historial
        </h2>
        {data.history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-input px-5 py-6">
            <p className="font-semibold">Todavía no tienes movimientos</p>
            <p className="text-sm text-muted-foreground">
              Ganas puntos cuando una entrega queda confirmada por las dos partes.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.history.map((entry) => {
              const row = describeEntry(entry);
              return (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", CHIP[row.tone])}>{row.label}</span>
                      <span className="tabular text-xs text-muted-foreground">{shortDate.format(new Date(entry.createdAt))}</span>
                    </div>
                    <p className="text-sm">{row.note}</p>
                  </div>
                  <span
                    className={cn("tabular shrink-0 text-lg font-bold", row.points.startsWith("+") ? "text-brand" : "text-foreground")}
                  >
                    {row.points}
                    <span className="sr-only"> puntos</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {data.history.length >= HISTORY_LIMIT ? (
          <p className="text-sm text-muted-foreground">Se muestran los últimos {HISTORY_LIMIT} movimientos.</p>
        ) : null}
      </section>
    </div>
  );
}
