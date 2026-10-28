import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { iconSizeFromParam, isMaskableParam, type IconSize } from "../icon-size";

// Colores de la marca en hex: la imagen se dibuja fuera del navegador y no entiende oklch ni
// variables CSS. Son --green-700, --paper y --amber-500 de src/app/globals.css.
const BRAND = "#125b3a";
const PAPER = "#f8f7f1";
const AMBER = "#f2b036";

function icon(size: IconSize, maskable: boolean) {
  // El ícono "maskable" lo recorta el sistema (círculo, cuadrado redondeado…): el símbolo tiene que
  // caber en el 80 % central. El normal puede ocupar más.
  const pinHeight = Math.round(size * (maskable ? 0.52 : 0.68));
  const pinWidth = Math.round(pinHeight * 0.8);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND,
        }}
      >
        {/* Mismas trazas que LogoMark (src/components/brand/logo.tsx), con los colores invertidos sobre el verde. */}
        <svg width={pinWidth} height={pinHeight} viewBox="0 0 32 40">
          <path
            d="M16 39.2c-.6 0-1.1-.3-1.5-.8C10.9 33.9 3 23.6 3 15.6 3 8.1 8.8 2 16 2s13 6.1 13 13.6c0 8-7.9 18.3-11.5 22.8-.4.5-.9.8-1.5.8Z"
            fill={PAPER}
          />
          <path
            d="M19.6 9.9a6.6 6.6 0 1 1-7.7.1"
            fill="none"
            stroke={BRAND}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path d="M10.3 6.6l5.2 1.6-3.4 4.4z" fill={BRAND} />
          <circle cx="16" cy="15.6" r="2" fill={AMBER} />
        </svg>
      </div>
    ),
    {
      width: size,
      height: size,
      // El ícono casi no cambia: un día en el navegador y una semana en la red de Vercel.
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" },
    },
  );
}

/** Ícono de la PWA: /pwa-icon/192 y /pwa-icon/512 (con `?maskable=1`, la variante recortable). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ size: string }> }) {
  const size = iconSizeFromParam((await params).size);
  if (!size) return new Response("Ese ícono no existe.", { status: 404 });
  return icon(size, isMaskableParam(request.nextUrl.searchParams.get("maskable")));
}
