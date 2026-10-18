import { polymerInk } from "@/components/polymer/polymer-chip";
import { POLYMERS, type PolymerCode } from "@/lib/domain/polymers";

type Pin = { x: number; y: number; code: PolymerCode; outside?: boolean };

// Recicladora/o en el centro; el anillo es el radio de 3 km.
const CENTER = { x: 300, y: 215 };
const RADIUS = 165;

const PINS: Pin[] = [
  { x: 262, y: 96, code: "HDPE" },
  { x: 252, y: 160, code: "PET" },
  { x: 446, y: 206, code: "PP" },
  { x: 440, y: 300, code: "PP" },
  { x: 395, y: 292, code: "HDPE" },
  { x: 282, y: 316, code: "LDPE" },
  { x: 352, y: 336, code: "PS" },
  { x: 515, y: 84, code: "LDPE", outside: true },
  { x: 48, y: 60, code: "PS", outside: true },
];

const SELECTED: Pin = { x: 372, y: 150, code: "PET" };

function PinShape({ pin, scale = 1 }: { pin: Pin; scale?: number }) {
  const { color, resinNumber } = POLYMERS[pin.code];
  return (
    <g
      transform={`translate(${pin.x} ${pin.y}) scale(${scale})`}
      opacity={pin.outside ? 0.45 : 1}
    >
      <path
        d="M0 0c-1.6-2.4-11-13.6-11-21a11 11 0 0 1 22 0c0 7.4-9.4 18.6-11 21Z"
        fill={color}
        stroke="var(--paper)"
        strokeWidth="2"
      />
      <text
        y="-17"
        textAnchor="middle"
        fontSize="11"
        fontWeight="800"
        fill={polymerInk(pin.code)}
      >
        {resinNumber}
      </text>
    </g>
  );
}

/** Vista del mapa del reciclador, ilustrada para la portada. */
export function DemoMap() {
  return (
    <svg
      viewBox="0 0 560 420"
      role="img"
      aria-label="Mapa de Santa Ana con lotes de plástico publicados alrededor de un reciclador, dentro de un radio de 3 km"
      className="block h-auto w-full font-sans"
    >
      <rect width="560" height="420" fill="var(--paper-3)" />
      {/* Parque y manzanas */}
      <path d="M86 40h120l18 74-96 26-54-46Z" fill="var(--brand-soft)" />
      <path d="M440 300h96v100h-120Z" fill="var(--brand-soft)" />
      {/* Calles secundarias */}
      <g stroke="var(--paper-2)" strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M0 96h560M0 300h560M120 0v420M470 0v420M0 180l560-40M60 420 360 0" />
        <path d="M240 420 300 0M0 380l560-60M380 0l60 420" />
      </g>
      {/* Avenidas */}
      <g stroke="var(--paper)" strokeWidth="14" strokeLinecap="round" fill="none">
        <path d="M0 236c120-10 260-34 560-20" />
        <path d="M318 0c-20 140-12 280 14 420" />
      </g>
      <text x="352" y="254" fontSize="12" fontWeight="600" fill="var(--ink-soft)">
        Av. Independencia
      </text>

      {/* Radio de búsqueda */}
      <circle
        cx={CENTER.x}
        cy={CENTER.y}
        r={RADIUS}
        fill="var(--brand)"
        fillOpacity="0.07"
        stroke="var(--brand)"
        strokeWidth="2"
        strokeDasharray="7 7"
      />
      <g transform={`translate(${CENTER.x - 20} ${CENTER.y - RADIUS - 10})`}>
        <rect width="40" height="20" rx="10" fill="var(--brand)" />
        <text x="20" y="14" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--paper)">
          3 km
        </text>
      </g>

      {PINS.map((pin, i) => (
        <PinShape key={i} pin={pin} />
      ))}

      {/* Lote seleccionado */}
      <PinShape pin={SELECTED} scale={1.45} />
      <g transform={`translate(${SELECTED.x + 22} ${SELECTED.y - 52})`}>
        <rect width="132" height="28" rx="8" fill="var(--ink)" />
        <text x="12" y="19" fontSize="13" fontWeight="700" fill="var(--paper)">
          PET · 40 kg · 1.8 km
        </text>
      </g>

      {/* Reciclador */}
      <circle cx={CENTER.x} cy={CENTER.y} r="11" fill="var(--brand)" stroke="var(--paper)" strokeWidth="4" />
      <g transform={`translate(${CENTER.x - 38} ${CENTER.y + 18})`}>
        <rect width="76" height="24" rx="12" fill="var(--paper)" stroke="var(--line)" />
        <text x="38" y="16" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink)">
          Don José
        </text>
      </g>

      {/* Escala */}
      <g transform="translate(470 396)">
        <path d="M0 0h55" stroke="var(--ink-soft)" strokeWidth="3" />
        <text x="62" y="4" fontSize="11" fill="var(--ink-soft)">
          1 km
        </text>
      </g>
    </svg>
  );
}
