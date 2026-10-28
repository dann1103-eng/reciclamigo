"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { TipoValorizador, UserRole } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string };

const GENERADOR: Item[] = [
  { href: "/comercio", label: "Mis lotes" },
  { href: "/comercio/historial", label: "Historial" },
  { href: "/comercio/reportes", label: "Reportes" },
  { href: "/comercio/programados", label: "Retiros programados" },
  { href: "/comercio/puntos", label: "ReciclaPuntos" },
  { href: "/comercio/plan", label: "Plan" },
];

const VALORIZADOR: Item[] = [
  { href: "/reciclador", label: "Mapa de lotes" },
  { href: "/reciclador/retiros", label: "Mis retiros" },
  { href: "/reciclador/avisos", label: "Avisos" },
  { href: "/reciclador/puntos", label: "ReciclaPuntos" },
];

const ADMINISTRADOR: Item[] = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/planes", label: "Planes" },
  { href: "/admin/comisiones", label: "Comisiones" },
  { href: "/admin/valorizadores", label: "Valorizadores" },
  { href: "/admin/puntos", label: "ReciclaPuntos" },
  { href: "/admin/configuracion", label: "Configuración" },
];

function itemsFor(role: UserRole, tipoValorizador: TipoValorizador | null): Item[] {
  switch (role) {
    case "generador":
      return GENERADOR;
    case "valorizador":
      return tipoValorizador === "volumen"
        ? [...VALORIZADOR, { href: "/reciclador/comisiones", label: "Comisiones" }]
        : VALORIZADOR;
    case "administrador":
      return ADMINISTRADOR;
    case "municipalidad":
      return [];
  }
}

/** Navegación de cada área. Cada enlace lleva a una pantalla de la misma área. */
export function AreaNav({ role, tipoValorizador }: { role: UserRole; tipoValorizador: TipoValorizador | null }) {
  const pathname = usePathname();
  const items = itemsFor(role, tipoValorizador);
  if (items.length === 0) return null;

  // El enlace "raíz" del área (p. ej. /comercio) solo está activo en esa ruta exacta.
  const root = items[0].href;
  const isActive = (href: string) => (href === root ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <nav aria-label="Secciones" className="border-b border-border bg-background">
      <ul className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-4 py-2 sm:px-8">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center rounded-lg px-3 text-sm font-semibold whitespace-nowrap transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active ? "bg-brand-soft text-brand" : "text-muted-foreground hover:bg-paper-2 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
