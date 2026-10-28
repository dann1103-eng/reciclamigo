export type PolymerCode = "PET" | "HDPE" | "LDPE" | "PP" | "PS";

export const POLYMER_CODES: PolymerCode[] = ["PET", "HDPE", "LDPE", "PP", "PS"];

// El color de cada polímero es la fuente única para pines, chips, gráficos y comprobante.
// Los precios de referencia (USD por libra) viven en la configuración (`app_settings`).
export const POLYMERS: Record<PolymerCode, { resinNumber: number; name: string; color: string }> = {
  PET: { resinNumber: 1, name: "Tereftalato de polietileno", color: "#2F6FDE" },
  HDPE: { resinNumber: 2, name: "Polietileno de alta densidad", color: "#E8833A" },
  LDPE: { resinNumber: 4, name: "Polietileno de baja densidad", color: "#8E63CE" },
  PP: { resinNumber: 5, name: "Polipropileno", color: "#D6457A" },
  PS: { resinNumber: 6, name: "Poliestireno", color: "#C9A227" },
};
