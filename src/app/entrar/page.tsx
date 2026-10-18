import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Store, Truck } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { DemoAccountButton } from "@/components/shell/demo-account-button";
import { SignInForm } from "@/components/shell/sign-in-form";

export const metadata: Metadata = { title: "Entrar" };

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export default function EntrarPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-5 py-8 sm:py-12">
      <Link href="/" className="self-start rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Logo />
      </Link>

      {demoMode ? (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">Entrar al demo</h1>
            <p className="text-lg text-muted-foreground">
              Elige una cuenta. Puedes cambiar entre comercio y reciclador desde la barra de arriba.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <DemoAccountButton
              role="comercio"
              icon={<Store className="size-6" aria-hidden="true" />}
              title="Comercio"
              account="Comedor La Ceiba, Santa Ana"
              detail="Publica lotes de plástico y ve su impacto."
            />
            <DemoAccountButton
              role="reciclador"
              icon={<Truck className="size-6" aria-hidden="true" />}
              title="Reciclador"
              account="Don José, reciclador de base"
              detail="Encuentra lotes cerca en el mapa y los recoge."
            />
          </div>

          <DemoAccountButton
            role="alcaldia"
            quiet
            icon={<BarChart3 className="size-5" aria-hidden="true" />}
            title="Reportes de alcaldía"
            account="Alcaldía de Santa Ana"
            detail="Solo lectura: totales, mapa de calor y ranking."
          />

          <details className="group rounded-xl border border-border px-4 py-3">
            <summary className="cursor-pointer list-none text-sm font-semibold text-muted-foreground marker:hidden">
              Entrar con correo y contraseña
            </summary>
            <div className="pt-4">
              <SignInForm />
            </div>
          </details>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-extrabold tracking-tight">Entrar</h1>
          <SignInForm />
        </>
      )}
    </main>
  );
}
