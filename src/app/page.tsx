import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { DemoMap } from "@/components/landing/demo-map";
import { WeighTicket } from "@/components/landing/weigh-ticket";
import { buttonVariants } from "@/components/ui/button";

const PILOT_GOALS = [
  { value: "180 t", label: "de plástico fuera del vertedero" },
  { value: "35", label: "recicladores de base formalizados" },
  { value: "360 t", label: "de CO₂e evitadas" },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 pt-6 sm:px-8">
        <Logo />
        <p className="hidden text-sm text-muted-foreground sm:block">Reto DINAMICA Express 2026</p>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14 lg:py-8">
        <section className="max-w-xl">
          <p className="text-sm font-semibold text-brand">
            Mercado de plástico reciclable en Santa Ana y San Salvador
          </p>
          <h1 className="mt-4 text-[clamp(2.25rem,1.4rem+3vw,3.75rem)] leading-[1.02] font-extrabold tracking-[-0.025em] [font-stretch:88%]">
            El plástico de tu negocio tiene comprador a 3 km.
          </h1>
          <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground">
            Publicas el lote, un reciclador cercano lo recoge y cada kilo queda
            registrado con su certificado para la Ley ANDRES.
          </p>
          <Link href="/entrar" className={buttonVariants({ size: "xl", className: "mt-8" })}>
            Entrar al demo
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </section>

        <div className="relative pb-6 lg:pb-0">
          <div className="overflow-hidden rounded-2xl border border-border shadow-raised lg:ml-20">
            <DemoMap />
          </div>
          <WeighTicket className="relative mx-auto -mt-16 -rotate-1 sm:mr-6 sm:ml-auto lg:absolute lg:-bottom-16 lg:-left-6 lg:m-0 lg:-rotate-2" />
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-5 sm:px-8 lg:flex-row lg:items-baseline lg:gap-8">
          <p className="text-sm font-semibold">Metas del piloto, primer año</p>
          <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-8">
            {PILOT_GOALS.map((goal) => (
              <li key={goal.value + goal.label} className="text-sm text-muted-foreground">
                <span className="tabular mr-1.5 text-base font-bold text-foreground">{goal.value}</span>
                {goal.label}
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  );
}
