import type { Metadata } from "next";

import { buttonVariants } from "@/components/ui/button";
import { AdminHeading } from "@/features/admin/components/admin-heading";
import { RedeemForm } from "@/features/admin/components/redeem-form";
import { fieldClass } from "@/features/admin/components/styles";
import { LEDGER_LIMIT, loadPointsDetail, loadPointsPeople, type LedgerEntry, type PointsPerson } from "@/features/admin/queries";
import { formatSvDate } from "@/features/plans/dates";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "ReciclaPuntos" };

const KIND_LABEL: Record<LedgerEntry["kind"], string> = { ganado: "Puntos ganados", canje: "Canje", ajuste: "Ajuste" };

const ROLE_LABEL: Partial<Record<PointsPerson["role"], string>> = { generador: "Comercio", valorizador: "Reciclador" };

const th = "px-3 py-2.5 font-semibold whitespace-nowrap";
const td = "px-3 py-2.5 align-top";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Ledger({ ledger, now }: { ledger: LedgerEntry[]; now: Date }) {
  if (ledger.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-input px-5 py-6">
        <p className="font-semibold">Todavía no tiene movimientos</p>
        <p className="text-sm text-muted-foreground">Gana puntos con cada entrega confirmada.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
        <caption className="sr-only">Historial de ReciclaPuntos</caption>
        <thead>
          <tr className="border-b border-border bg-paper-2">
            <th scope="col" className={th}>Fecha</th>
            <th scope="col" className={th}>Movimiento</th>
            <th scope="col" className={cn(th, "text-right")}>Puntos</th>
            <th scope="col" className={th}>Detalle</th>
          </tr>
        </thead>
        <tbody>
          {ledger.map((l) => {
            const expired = l.kind === "ganado" && l.expiresAt !== null && new Date(l.expiresAt) <= now;
            return (
              <tr key={l.id} className="border-b border-border last:border-b-0">
                <td className={cn(td, "tabular whitespace-nowrap")}>{formatSvDate(l.createdAt)}</td>
                <td className={td}>{KIND_LABEL[l.kind]}</td>
                <td className={cn(td, "tabular text-right font-semibold")}>{l.points > 0 ? `+${l.points}` : l.points}</td>
                <td className={cn(td, "text-muted-foreground")}>
                  {l.note ? <span className="block text-foreground">{l.note}</span> : null}
                  {l.kind === "ganado" && l.expiresAt ? (
                    <span className="tabular block">
                      {expired ? "Caducaron" : `Quedan ${l.remaining ?? 0}`} · {expired ? "el" : "caducan el"} {formatSvDate(l.expiresAt)}
                    </span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminPuntosPage({ searchParams }: { searchParams: Promise<{ persona?: string }> }) {
  await requireRole("administrador");
  const { persona } = await searchParams;
  const supabase = await createClient();
  const people = await loadPointsPeople(supabase);

  const selected = persona && uuid.test(persona) ? people.find((p) => p.id === persona) : undefined;
  const detail = selected ? await loadPointsDetail(supabase, selected.id) : null;
  const now = new Date();

  const comercios = people.filter((p) => p.role === "generador");
  const recicladores = people.filter((p) => p.role === "valorizador");

  return (
    <>
      <AdminHeading title="ReciclaPuntos">
        <p>
          Elige a una persona para ver su saldo y su historial. <strong className="text-foreground">El canje es manual por ahora</strong>
          : entregas el premio por fuera y aquí registras los puntos que se descuentan.
        </p>
      </AdminHeading>

      {/* Sin JavaScript: el formulario manda ?persona=<id> por GET. */}
      <form method="get" className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-64 flex-col gap-1">
          <label htmlFor="persona" className="text-sm font-semibold">
            Persona
          </label>
          <select id="persona" name="persona" defaultValue={selected?.id ?? ""} className={fieldClass}>
            <option value="" disabled>
              Elige un comercio o un reciclador
            </option>
            <optgroup label="Comercios">
              {comercios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.municipality}
                </option>
              ))}
            </optgroup>
            <optgroup label="Recicladores">
              {recicladores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.municipality}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <button type="submit" className={buttonVariants({ size: "lg", className: "h-11 px-4" })}>
          Ver puntos
        </button>
      </form>

      {persona && !selected ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          No se encontró a esa persona. Elígela de la lista.
        </p>
      ) : null}

      {selected && detail ? (
        <>
          <section aria-labelledby="saldo" className="flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-4">
            <h2 id="saldo" className="text-sm font-semibold text-muted-foreground">
              {selected.name} · {ROLE_LABEL[selected.role]} · {selected.orgType}
            </h2>
            <p className="tabular text-3xl font-extrabold tracking-tight">{detail.balance} puntos</p>
            <p className="text-sm text-muted-foreground">Saldo vigente: sin contar los que ya caducaron ni los canjeados.</p>
          </section>

          <RedeemForm profileId={selected.id} name={selected.name} balance={detail.balance} />

          <section aria-labelledby="historial" className="flex flex-col gap-3">
            <h2 id="historial" className="text-xl font-bold">
              Historial
            </h2>
            <Ledger ledger={detail.ledger} now={now} />
            {detail.ledger.length >= LEDGER_LIMIT ? (
              <p className="text-sm text-muted-foreground">Se muestran los últimos {LEDGER_LIMIT} movimientos.</p>
            ) : null}
          </section>
        </>
      ) : null}
    </>
  );
}
