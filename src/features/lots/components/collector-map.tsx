"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

import type { PolymerCode } from "@/lib/domain/polymers";
import type { LatLng } from "@/lib/geo";
import { createClient } from "@/lib/supabase/client";

import { fetchNearbyLots } from "../queries";
import { DEFAULT_RADIUS, type NearbyLot, type RadiusM } from "../types";

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
}: {
  center: LatLng;
  initialLots: NearbyLot[];
  collectorName: string;
}) {
  const [radiusM, setRadiusM] = useState<RadiusM>(DEFAULT_RADIUS);
  const [polymers, setPolymers] = useState<PolymerCode[]>([]);
  const [lots, setLots] = useState(initialLots);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = useRef(true);
  const panelRef = useRef<HTMLElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchNearbyLots(createClient(), { ...center, radiusM, polymers });
      setLots(next);
      setSelectedId((id) => (id && next.some((l) => l.id === id) ? id : null));
    } catch {
      setError("No se pudieron cargar los lotes. Revisa la conexión.");
    } finally {
      setLoading(false);
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
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedId]);

  const selected = lots.find((l) => l.id === selectedId) ?? null;
  const togglePolymer = (code: PolymerCode) =>
    setPolymers((cur) => (cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code]));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Lotes cerca de ti</h1>
        <p className="tabular text-muted-foreground" aria-live="polite">
          {loading ? "Buscando…" : `${lots.length} ${lots.length === 1 ? "lote publicado" : "lotes publicados"} a ${radiusM / 1000} km`}
        </p>
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
              <LotFilters radiusM={radiusM} polymers={polymers} onRadius={setRadiusM} onTogglePolymer={togglePolymer} />
              {error ? (
                <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                  {error}
                </p>
              ) : null}
              <LotList
                lots={lots}
                radiusM={radiusM}
                filtered={polymers.length > 0}
                loading={loading}
                onSelect={setSelectedId}
                onWiden={() => setRadiusM(5000)}
              />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
