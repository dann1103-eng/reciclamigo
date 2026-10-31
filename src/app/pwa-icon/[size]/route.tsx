import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { LOGO_MARK_ASPECT, LOGO_MARK_PATH, LOGO_MARK_VIEWBOX } from "@/components/brand/logo-mark-path";

import { iconSizeFromParam, isMaskableParam, type IconSize } from "../icon-size";

// Colores del manual de marca en hex: la imagen se dibuja fuera del navegador y no entiende oklch
// ni variables CSS. Es el ícono de tienda del manual: la bolsa en verde oscuro sobre blanco.
const BRAND = "#0b4633";
const WHITE = "#ffffff";

function icon(size: IconSize, maskable: boolean) {
  // El ícono "maskable" lo recorta el sistema (círculo, cuadrado redondeado…): el símbolo tiene que
  // caber en el 80 % central. El normal puede ocupar más.
  const markHeight = Math.round(size * (maskable ? 0.5 : 0.66));
  const markWidth = Math.round(markHeight * LOGO_MARK_ASPECT);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: WHITE,
        }}
      >
        {/* La misma traza que LogoMark (src/components/brand/logo.tsx). */}
        <svg width={markWidth} height={markHeight} viewBox={LOGO_MARK_VIEWBOX}>
          <path d={LOGO_MARK_PATH} fill={BRAND} fillRule="evenodd" />
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
