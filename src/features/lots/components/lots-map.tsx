"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";

import { polymerInk } from "@/components/polymer/polymer-chip";
import { POLYMERS, type PolymerCode } from "@/lib/domain/polymers";
import type { LatLng } from "@/lib/geo";

import { spreadOverlapping } from "../spread";
import type { NearbyLot, RadiusM } from "../types";

// Leaflet pinta con atributos SVG, que no aceptan var(): mismo valor que --brand en globals.css.
const BRAND = "oklch(0.42 0.09 158)";
const ZOOM: Record<RadiusM, number> = { 1000: 15, 3000: 13, 5000: 12 };

const iconCache = new Map<string, L.DivIcon>();

/** Pin del color del polímero con su número de resina (mismo dibujo que la portada). */
function pinIcon(code: PolymerCode, selected: boolean, offsetPx: number): L.DivIcon {
  const key = `${code}-${selected}-${offsetPx}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const { color, resinNumber } = POLYMERS[code];
  const w = selected ? 40 : 30;
  const h = Math.round(w * 1.33);
  const icon = L.divIcon({
    className: "", // sin la caja blanca por defecto de Leaflet
    iconSize: [w, h],
    iconAnchor: [w / 2 - offsetPx, h], // desplaza el dibujo, no la coordenada
    html: `<svg viewBox="-12 -24 24 32" width="${w}" height="${h}" style="display:block;filter:drop-shadow(0 2px 3px oklch(0.24 0.045 160 / .35))">
      <path d="M0 6c-1.6-2.4-11-13.6-11-21a11 11 0 0 1 22 0c0 7.4-9.4 18.6-11 21Z" style="fill:${color};stroke:var(--paper);stroke-width:2"/>
      <text y="-11" text-anchor="middle" font-size="11" font-weight="800" style="fill:${polymerInk(code)};font-family:var(--font-archivo),sans-serif">${resinNumber}</text>
    </svg>`,
  });
  iconCache.set(key, icon);
  return icon;
}

function FlyTo({ target, zoom }: { target: LatLng; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([target.lat, target.lng], zoom, { duration: 0.6 });
  }, [map, target.lat, target.lng, zoom]);
  return null;
}

export function LotsMap({
  center,
  radiusM,
  lots,
  selectedId,
  onSelect,
}: {
  center: LatLng;
  radiusM: RadiusM;
  lots: NearbyLot[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const shown = useMemo(() => spreadOverlapping(lots), [lots]);
  const selected = shown.find((l) => l.id === selectedId);

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={ZOOM[radiusM]}
      scrollWheelZoom
      // Teselas un poco apagadas para que resalten los pines de colores.
      className="size-full [&_.leaflet-tile-pane]:saturate-[0.55]"
      aria-label="Mapa de lotes cercanos"
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <Circle
        center={[center.lat, center.lng]}
        radius={radiusM}
        pathOptions={{ color: BRAND, weight: 2, dashArray: "6 6", fillColor: BRAND, fillOpacity: 0.06 }}
      />
      <CircleMarker
        center={[center.lat, center.lng]}
        radius={9}
        pathOptions={{ color: "#fbfaf4", weight: 3, fillColor: BRAND, fillOpacity: 1 }}
      >
        <Tooltip permanent direction="top" offset={[0, -10]}>
          Tu ubicación
        </Tooltip>
      </CircleMarker>
      {shown.map((lot) => (
        <Marker
          key={lot.id}
          position={[lot.lat, lot.lng]}
          icon={pinIcon(lot.polymer_code as PolymerCode, lot.id === selectedId, lot.offsetPx)}
          zIndexOffset={lot.id === selectedId ? 1000 : 0}
          title={`${lot.polymer_code}, ${lot.estimated_kg} kg, ${lot.generator_name}`}
          eventHandlers={{ click: () => onSelect(lot.id) }}
        />
      ))}
      <FlyTo
        target={selected ?? center}
        zoom={selected ? Math.max(ZOOM[radiusM], 15) : ZOOM[radiusM]}
      />
    </MapContainer>
  );
}
