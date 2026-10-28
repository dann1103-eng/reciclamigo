"use client";

import { ClipboardList } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { PolymerCode } from "@/lib/domain/polymers";
import type { LatLng } from "@/lib/geo";
import { createClient } from "@/lib/supabase/client";

import { createLatestGuard } from "../latest";
import { fetchNearbyLots } from "../queries";
import type { NearbyLot, RadiusM } from "../types";

import { LotDetailPanel } from "./lot-detail-panel";
import { LotFilters } from "./lot-filters";
import { LotList } from "./lot-list";

// Leaflet necesita window: solo en el navegador.
const LotsMap = dynamic(() => import("./lots-map").then((m) => m.LotsMap), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-paper-2" aria-label="Cargando mapa" />,
});

export function CollectorMap({
  center,
  initialLots,
  collectorName,
  pendingPickups,
  radii,
  defaultRadiusM,
  initialSelectedId = null,
}: {
  center: LatLng;
  initialLots: NearbyLot[];
  collectorName: string;
  pendingPickups: number;
  /** Radios disponibles (m) y el que se usa al abrir; salen de la configuración. */
  radii: RadiusM[];
  defaultRadiusM: RadiusM;
  /** Lote que abrió un aviso push o un enlace (?lote=…); se muestra seleccionado si sigue publicado. */
  initialSelectedId?: string | null;
}) {
  const [radiusM, setRadiusM] = useState<RadiusM>(defaultRadiusM);
  const [polymers, setPolymers] = useState<PolymerCode[]>([]);
  const [lots, setLots] = useState(initialLots);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId && initialLots.some((l) => l.id === initialSelectedId) ? initialSelectedId : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = useRef(true);
  const panelRef = useRef<HTMLElement>(null);

  const guard = useRef(createLatestGuard());

  const load = useCallback(async () => {
    const request = guard.current.next(); // si el usuario cambia de filtro rápido, la respuesta vieja se descarta
    setLoading(true);
    setError(null);
    try {
      const next = await fetchNearbyLots(createClient(), { ...center, radiusM, polymers });
      if (!guard.current.isLatest(request)) return;
      setLots(next);
      setSelectedId((id) => (id && next.some((l) => l.id === id) ? id : null));
    } catch {
      if (!guard.current.isLatest(request)) return;
      setLots([]); // nunca dejar lotes de otro radio bajo la etiqueta nueva
      setSelectedId(null);
      setError("No se pudieron cargar los lotes. Revisa la conexión.");
    } finally {
      if (guard.current.isLatest(request)) setLoading(false);
    }
  }, [center, radiusM, polymers]);

  useEffect(() => {
    if (first.current) {
      first.current = false; // los lotes iniciales ya vienen del servidor
      return;
    }
    void load();
  }, [load]);

  // En pantallas angostas la ficha queda bajo el mapa: llévala a la vista al elegir un lote.
  useEffect(() => {
    if (selectedId && window.matchMedia("(max-width: 1023px)").matches) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      panelRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }, [selectedId]);

  const selected = lots.find((l) => l.id === selectedId) ?? null;
  const togglePolymer = (code: PolymerCode) =>
    setPolymers((cur) => (cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Lotes cerca de ti</h1>
          <p className="tabular text-muted-foreground" aria-live="polite">
            {loading ? "Buscando…" : `${lots.length} ${lots.length === 1 ? "lote publicado" : "lotes publicados"} a ${radiusM / 1000} km`}
          </p>
        </div>
        <Link
          href="/reciclador/retiros"
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold outline-none transition-colors duration-200 hover:bg-paper-2 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ClipboardList className="size-4 text-brand" aria-hidden="true" />
          Mis retiros
          {pendingPickups > 0 ? (
            <span className="tabular rounded-full bg-accent-warm-soft px-2 py-0.5 text-xs font-bold text-accent-warm-ink">
              {pendingPickups} por atender
            </span>
          ) : null}
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="relative isolate h-[55dvh] min-h-80 overflow-hidden rounded-2xl border border-border shadow-raised lg:h-[calc(100dvh-14rem)] lg:min-h-[30rem]">
          <LotsMap center={center} radiusM={radiusM} lots={lots} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        <aside ref={panelRef} className="flex scroll-mt-20 flex-col gap-4 lg:h-[calc(100dvh-14rem)] lg:min-h-[30rem] lg:overflow-y-auto lg:pr-1">
          {selected ? (
            <LotDetailPanel
              lot={selected}
              collectorName={collectorName}
              onBack={() => setSelectedId(null)}
              onTaken={() => {
                setSelectedId(null);
                void load();
              }}
            />
          ) : (
            <>
              <LotFilters radii={radii} radiusM={radiusM} polymers={polymers} onRadius={setRadiusM} onTogglePolymer={togglePolymer} />
              {error ? (
                <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                  {error}
                </p>
              ) : null}
              <LotList
                lots={lots}
                radiusM={radiusM}
                maxRadiusM={radii[radii.length - 1]}
                filtered={polymers.length > 0}
                loading={loading}
                onSelect={setSelectedId}
                onWiden={() => setRadiusM(radii[radii.length - 1])}
              />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
