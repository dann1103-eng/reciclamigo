import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { formatPct } from "@/features/commissions/format";
import { planPriceLabel } from "@/features/plans/comparison";
import { PlansComparison } from "@/features/plans/components/plans-comparison";
import { getSettings } from "@/lib/settings/load";

export const metadata: Metadata = {
  title: "Planes",
  description: "Vender siempre es gratis. El Plan Trazabilidad es para quien necesita documentar lo que recicla.",
};

/** Pública: se puede ver sin cuenta. El precio y los límites salen de la configuración. */
export default async function PlanesPage() {
  const settings = await getSettings();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-5 pt-6 sm:px-8">
        <Link href="/" className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Logo />
        </Link>
        <Link href="/entrar" className={buttonVariants({ size: "lg", variant: "outline", className: "h-11 px-4" })}>
          Entrar
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-5 py-10 sm:px-8 sm:py-12">
        <div className="flex max-w-prose flex-col gap-3">
          <h1 className="text-[clamp(2rem,1.4rem+2.4vw,3rem)] leading-[1.05] font-extrabold tracking-[-0.025em] [font-stretch:88%]">
            Planes para comercios
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Dos opciones: el plan gratis y el Plan Trazabilidad, que cuesta {planPriceLabel(settings.planPriceUsd)}.
          </p>
        </div>

        <PlansComparison
          priceUsd={settings.planPriceUsd}
          freeLotsPerMonth={settings.freeLotsPerMonth}
          freeHistoryDays={settings.freeHistoryDays}
        />

        <section aria-labelledby="como-se-activa" className="flex max-w-prose flex-col gap-3">
          <h2 id="como-se-activa" className="text-xl font-bold">
            Cómo se activa el plan
          </h2>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 leading-relaxed">
            <li>Entra a tu cuenta de comercio y abre la sección Plan.</li>
            <li>Toca “Pedir activación”.</li>
            <li>El equipo de Reciclamigo se pone en contacto contigo, coordina el pago y activa el plan a mano.</li>
          </ol>
          <p className="text-sm text-muted-foreground">Por ahora no hay pago en línea.</p>
          <Link href="/entrar" className={buttonVariants({ size: "xl", className: "mt-2 w-fit" })}>
            Entrar
          </Link>
        </section>

        <section aria-labelledby="recicladores" className="flex max-w-prose flex-col gap-2 border-t border-border pt-6">
          <h2 id="recicladores" className="text-lg font-bold">
            ¿Eres reciclador?
          </h2>
          <p className="leading-relaxed text-muted-foreground">
            No pagas suscripción ni necesitas descargar nada. Los recicladores de base pagan 0 % de comisión; solo los compradores de
            volumen pagan {formatPct(settings.commissionPct)} sobre sus compras confirmadas.
          </p>
        </section>
      </main>
    </div>
  );
}
