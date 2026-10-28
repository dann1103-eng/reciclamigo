import { ImageResponse } from "next/og";

import { loadCircular } from "@/features/circular/load";
import { deliveriesLabel } from "@/features/circular/state";
import { formatLb } from "@/lib/domain/units";
import { createClient } from "@/lib/supabase/server";

export const alt = "Comercio Circular en Reciclamigo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Colores del tema escritos a mano: Satori no lee las variables CSS de la app.
const INK = "#1c2b22";
const BRAND = "#2a6b47";
const PAPER = "#f7f6ef";
const SOFT = "#dcefdf";

const shorten = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** Imagen que ven quienes reciben el enlace por WhatsApp o redes. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await loadCircular(await createClient(), slug);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          color: INK,
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800 }}>Reciclamigo</div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 700,
              color: BRAND,
              background: SOFT,
              borderRadius: 999,
              padding: "10px 28px",
            }}
          >
            Comercio Circular
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: data ? 80 : 64, fontWeight: 800, lineHeight: 1.05 }}>
            {data ? shorten(data.businessName, 60) : "Comercio Circular"}
          </div>
          {data ? (
            <div style={{ display: "flex", fontSize: 44, color: BRAND, fontWeight: 700 }}>
              {`${formatLb(data.totalLb)} de plástico reciclado`}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", fontSize: 30 }}>
          {data
            ? `${data.deliveries} ${deliveriesLabel(data.deliveries)} en Reciclamigo`
            : "El plástico de tu negocio tiene comprador"}
        </div>
      </div>
    ),
    size,
  );
}
