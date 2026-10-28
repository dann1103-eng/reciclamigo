import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

export default function ComprobanteNoEncontrado() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-start justify-center gap-6 px-5">
      <Logo />
      <h1 className="text-3xl font-extrabold tracking-tight">Comprobante no encontrado</h1>
      <p className="text-lg text-muted-foreground">
        Revisa el código: tiene la forma RCA-2026-XXXXXX. Si lo escaneaste de un documento impreso y no aparece, pide al
        comercio una copia nueva.
      </p>
      <Link href="/" className={buttonVariants({ size: "xl", variant: "outline" })}>
        Ir a Reciclamigo
      </Link>
    </main>
  );
}
