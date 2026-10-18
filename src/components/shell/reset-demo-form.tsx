"use client";

import { LoaderCircle, RotateCcw } from "lucide-react";
import { useState, type FormEvent } from "react";

import { buttonVariants } from "@/components/ui/button";

type Summary = { users: number; lots: number; completedPickups: number };

export function ResetDemoForm({ initialToken }: { initialToken: string }) {
  const [token, setToken] = useState(initialToken);
  const [pending, setPending] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSummary(null);
    try {
      const res = await fetch(`/demo/reset?token=${encodeURIComponent(token.trim())}`, { method: "POST" });
      if (res.status === 401) setError("Token incorrecto o modo demo desactivado.");
      else if (!res.ok) setError("No se pudo reiniciar. Revisa la conexión e inténtalo de nuevo.");
      else setSummary((await res.json()) as Summary);
    } catch {
      setError("No se pudo reiniciar. Revisa la conexión e inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Token de reinicio
        <input
          type="password"
          autoComplete="off"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="h-12 rounded-lg border border-input bg-card px-3 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        />
      </label>
      <button type="submit" disabled={pending || !token.trim()} className={buttonVariants({ size: "xl" })}>
        {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
        {pending ? "Reiniciando…" : "Reiniciar demo"}
      </button>
      {summary ? (
        <p role="status" className="tabular rounded-lg bg-brand-soft px-4 py-3 text-sm font-semibold text-brand">
          Demo reiniciado: {summary.users} cuentas, {summary.lots} lotes y {summary.completedPickups} retiros completados.
          Las cuentas demo deben volver a entrar.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
