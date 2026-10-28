/** Secciones de la pantalla de configuración y los ajustes (claves de app_settings) de cada una, en orden. */
const GROUPS: { title: string; keys: string[] }[] = [
  {
    title: "Plan y límites",
    keys: ["plan_trazabilidad_precio_usd", "plan_duracion_dias", "lotes_gratis_por_mes", "historial_gratis_dias"],
  },
  { title: "Comisión", keys: ["comision_volumen_pct"] },
  {
    title: "Precios de referencia por libra",
    keys: [
      "precio_ref_pet_usd_lb",
      "precio_ref_hdpe_usd_lb",
      "precio_ref_ldpe_usd_lb",
      "precio_ref_pp_usd_lb",
      "precio_ref_ps_usd_lb",
    ],
  },
  {
    title: "Avisos",
    keys: [
      "radios_aviso_km",
      "radio_extra_plan_km",
      "aviso_retraso_gratis_min",
      "aviso_retraso_reputacion_min",
      "aviso_retraso_programado_min",
    ],
  },
  { title: "Reservas", keys: ["horas_liberar_reserva"] },
  {
    title: "ReciclaPuntos",
    keys: ["reciclapuntos_por_lb", "reciclapuntos_tope_mensual", "reciclapuntos_caducidad_dias"],
  },
  { title: "Impacto ambiental", keys: ["factor_co2_mixto"] },
  { title: "Contacto", keys: ["contacto_whatsapp_reciclamigo"] },
];

const OTHERS = "Otros ajustes";

/** Reparte los ajustes en secciones. Uno que no esté en ninguna va a "Otros ajustes" para no esconderlo. */
export function groupSettings<T extends { key: string }>(rows: T[]): { title: string; rows: T[] }[] {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const placed = new Set<string>();

  const groups = GROUPS.map(({ title, keys }) => {
    const inGroup = keys.flatMap((key) => {
      const row = byKey.get(key);
      if (!row) return [];
      placed.add(key);
      return [row];
    });
    return { title, rows: inGroup };
  }).filter((g) => g.rows.length > 0);

  const others = rows.filter((r) => !placed.has(r.key));
  return others.length > 0 ? [...groups, { title: OTHERS, rows: others }] : groups;
}
