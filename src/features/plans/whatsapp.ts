import { whatsappLink } from "@/features/lots/whatsapp";

/** Mensaje que el comercio le manda al equipo de Reciclamigo para pedir el plan. */
export function planActivationMessage(businessName: string): string {
  return `Hola, quiero activar el Plan Trazabilidad para ${businessName}`;
}

/** Enlace wa.me al WhatsApp de Reciclamigo; null si la configuración no tiene número. */
export function planActivationUrl(contactWhatsapp: string | null, businessName: string): string | null {
  return contactWhatsapp ? whatsappLink(contactWhatsapp, planActivationMessage(businessName)) : null;
}
