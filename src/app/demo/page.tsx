import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { ResetDemoForm } from "@/components/shell/reset-demo-form";

export const metadata: Metadata = { title: "Reiniciar el demo", robots: { index: false, follow: false } };

/**
 * Página discreta para quien presenta: guárdala como marcador con ?token=… y un toque
 * deja los datos del demo como recién sembrados. Solo existe en modo demo.
 */
export default async function DemoPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") notFound();
  const { token } = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-5 py-10">
      <Logo />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Reiniciar el demo</h1>
        <p className="text-muted-foreground">
          Borra todos los lotes, retiros y calificaciones y vuelve a cargar los datos de ejemplo. Úsalo antes de cada
          ensayo y justo antes de presentar.
        </p>
      </div>
      <ResetDemoForm initialToken={token ?? ""} />
    </main>
  );
}
