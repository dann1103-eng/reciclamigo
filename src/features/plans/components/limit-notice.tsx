import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

import { planPriceLabel } from "../comparison";

/**
 * Aviso para cuando publicar falla con code === "limite_gratis". Aclara que nada de lo ya hecho se
 * bloquea y manda a /comercio/plan.
 */
export function LimitNotice({ limit, priceUsd }: { limit: number; priceUsd: number }) {
  const lotes = limit === 1 ? "tu lote gratis" : `tus ${limit} lotes gratis`;
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-xl border border-accent-warm-ink/30 bg-accent-warm-soft px-4 py-4 text-accent-warm-ink">
      <div className="flex flex-col gap-1.5">
        <p className="text-lg font-bold">Ya publicaste {lotes} de este mes</p>
        <p>
          Lo que ya publicaste y tus entregas siguen funcionando igual: puedes confirmar entregas y sacar tus comprobantes como
          siempre.
        </p>
        <p>
          El 1.º del próximo mes vuelves a tener {limit === 1 ? "tu lote gratis" : `${limit} lotes gratis`}. Si necesitas publicar más
          antes, el Plan Trazabilidad cuesta {planPriceLabel(priceUsd)} y no limita los lotes.
        </p>
      </div>
      <Link href="/comercio/plan" className={buttonVariants({ size: "xl", className: "w-fit" })}>
        Ver el Plan Trazabilidad
      </Link>
    </div>
  );
}
