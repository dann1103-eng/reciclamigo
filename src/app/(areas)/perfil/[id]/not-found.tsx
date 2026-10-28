import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function PerfilNoEncontrado() {
  return (
    <div className="flex flex-col items-start gap-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Este perfil no existe</h1>
      <p className="max-w-[60ch] text-lg text-muted-foreground">
        Revisa el enlace. Solo los comercios y los recicladores tienen perfil que puedan ver los demás.
      </p>
      <Link href="/inicio" className={buttonVariants({ size: "xl", variant: "outline" })}>
        Volver a mi pantalla
      </Link>
    </div>
  );
}
