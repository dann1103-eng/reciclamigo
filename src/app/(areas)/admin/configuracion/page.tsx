import type { Metadata } from "next";

import { AdminHeading } from "@/features/admin/components/admin-heading";
import { SettingRow } from "@/features/admin/components/setting-row";
import { loadSettingRows } from "@/features/admin/queries";
import { groupSettings } from "@/features/admin/settings-groups";
import { settingKind, splitProvisional } from "@/features/admin/settings-input";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Configuración" };

export default async function AdminConfiguracionPage() {
  await requireRole("administrador");
  const supabase = await createClient();
  const rows = await loadSettingRows(supabase);
  const groups = groupSettings(rows);

  return (
    <>
      <AdminHeading title="Configuración">
        <p>
          Precios, límites, comisión, radios y horas de la app. Cada cambio vale desde que lo guardas. La base revisa el tipo y el
          rango de cada valor y te avisa si no es válido. Los ajustes marcados como provisionales están pendientes de definir con el
          equipo.
        </p>
      </AdminHeading>

      {groups.map((group, index) => (
        <section key={group.title} aria-labelledby={`grupo-${index}`} className="flex flex-col gap-1">
          <h2 id={`grupo-${index}`} className="text-xl font-bold">
            {group.title}
          </h2>
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card px-4">
            {group.rows.map((row) => {
              const { text, provisional } = splitProvisional(row.description);
              return (
                <SettingRow
                  key={row.key}
                  settingKey={row.key}
                  label={text}
                  provisional={provisional}
                  kind={settingKind(row.key)}
                  savedValue={row.value}
                  minValue={row.minValue}
                  maxValue={row.maxValue}
                />
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
