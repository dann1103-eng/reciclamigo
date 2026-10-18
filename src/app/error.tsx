"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

// Red de seguridad: cualquier error de una página muestra esto en vez de la pantalla genérica.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-start justify-center gap-6 px-5">
      <Logo />
      <h1 className="text-3xl font-extrabold tracking-tight">Algo falló al cargar esta pantalla</h1>
      <p className="text-lg text-muted-foreground">
        Puede ser la conexión. Inténtalo de nuevo; si sigue fallando, vuelve a entrar al demo.
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={reset} className={buttonVariants({ size: "xl" })}>
          <RotateCcw aria-hidden="true" />
          Reintentar
        </button>
        <Link href="/entrar" className={buttonVariants({ size: "xl", variant: "outline" })}>
          Volver a entrar
        </Link>
      </div>
    </main>
  );
}
