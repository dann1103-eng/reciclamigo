import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

export default function CircularNoEncontrada() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-start justify-center gap-6 px-5">
      <Logo />
      <h1 className="text-3xl font-extrabold tracking-tight">Esta insignia no está disponible</h1>
      <p className="text-lg text-muted-foreground">
        Puede que la dirección esté mal escrita, que el comercio todavía no tenga una entrega confirmada o que su página
        pública esté pausada. Si escaneaste un QR impreso, pide al comercio que revise su enlace.
      </p>
      <Link href="/" className={buttonVariants({ size: "xl", variant: "outline" })}>
        Ir a Reciclamigo
      </Link>
    </main>
  );
}
