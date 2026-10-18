import type { Metadata } from "next";

import { MunicipalDashboard } from "@/features/municipal/components/municipal-dashboard";

export const metadata: Metadata = { title: "Reportes" };

export default function AlcaldiaPage() {
  return <MunicipalDashboard />;
}
