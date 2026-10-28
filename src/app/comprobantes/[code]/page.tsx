import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { loadVoucher } from "@/features/vouchers/load";
import { voucherQrDataUrl } from "@/features/vouchers/qr";
import { isVoucherCode, normalizeVoucherCode } from "@/features/vouchers/url";
import { Voucher } from "@/features/vouchers/components/voucher";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings/load";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  return { title: isVoucherCode(code) ? `Comprobante ${code}` : "Comprobante no encontrado" };
}

/** Verificación pública: cualquiera con el código (o el QR) puede verlo, sin iniciar sesión. */
export default async function ComprobantePage({ params }: Props) {
  const { code } = await params;
  const canonical = normalizeVoucherCode(decodeURIComponent(code));
  if (canonical && canonical !== code) redirect(`/comprobantes/${canonical}`); // escrito a mano en minúsculas
  // Una caída de la base lanza y la muestra error.tsx ("Reintentar"), nunca "no encontrado".
  const voucher = await loadVoucher(await createClient(), code);
  if (!voucher) notFound();

  const [qr, settings] = await Promise.all([voucherQrDataUrl(code), getSettings()]);
  return (
    <main className="flex flex-1 flex-col px-4 py-8 sm:py-12 print:p-0">
      {/* A4 con márgenes de imprenta; la página se imprime sin nada más de la app. */}
      <style>{"@page { size: A4; margin: 16mm; } @media print { body { background: #fff; } }"}</style>
      <Voucher voucher={voucher} qr={qr} co2Factor={settings.co2Factor} />
    </main>
  );
}
