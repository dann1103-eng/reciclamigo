import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Certificate } from "@/features/certificates/components/certificate";
import { loadCertificate } from "@/features/certificates/load";
import { certificateQrDataUrl } from "@/features/certificates/qr";
import { isCertificateCode, normalizeCertificateCode } from "@/features/certificates/url";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  return { title: isCertificateCode(code) ? `Certificado ${code}` : "Certificado no encontrado" };
}

/** Verificación pública: cualquiera con el código (o el QR) puede verlo, sin iniciar sesión. */
export default async function CertificadoPage({ params }: Props) {
  const { code } = await params;
  const canonical = normalizeCertificateCode(decodeURIComponent(code));
  if (canonical && canonical !== code) redirect(`/certificados/${canonical}`); // escrito a mano en minúsculas
  // Una caída de la base lanza y la muestra error.tsx ("Reintentar"), nunca "no encontrado".
  const cert = await loadCertificate(await createClient(), code);
  if (!cert) notFound();

  const qr = await certificateQrDataUrl(code);
  return (
    <main className="flex flex-1 flex-col px-4 py-8 sm:py-12 print:p-0">
      {/* A4 con márgenes de imprenta; la página se imprime sin nada más de la app. */}
      <style>{"@page { size: A4; margin: 16mm; } @media print { body { background: #fff; } }"}</style>
      <Certificate cert={cert} qr={qr} />
    </main>
  );
}
