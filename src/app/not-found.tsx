import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-start justify-center gap-6 px-5">
      <Logo />
      <h1 className="text-3xl font-extrabold tracking-tight">Esta página no existe</h1>
      <p className="text-lg text-muted-foreground">
        Revisa la dirección o vuelve al inicio para entrar al demo.
      </p>
      <Link href="/" className={buttonVariants({ size: "xl" })}>
        Volver al inicio
      </Link>
    </main>
  );
}
