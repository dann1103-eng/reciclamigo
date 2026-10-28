import type { ChannelResult, NotifyChannel } from "./channels";
import { errorText } from "./errors";
import type { Message } from "./types";

export type DeliveryOutcome =
  | { status: "delivered" }
  /** Ningún canal tenía por dónde mandarlo (la persona no activó avisos). El aviso no se reintenta. */
  | { status: "nothing_to_deliver" }
  /** Hubo canales con problemas y ninguno lo entregó: vale la pena reintentar. */
  | { status: "failed"; error: string };

/**
 * Manda un mensaje por todos los canales. Un canal que lanza una excepción cuenta como fallo de ese
 * canal y no frena a los demás. Con que uno entregue, el aviso está entregado.
 */
export async function deliver(channels: NotifyChannel[], profileId: string, message: Message): Promise<DeliveryOutcome> {
  const results = await Promise.all(
    channels.map(async (channel): Promise<{ name: string; result: ChannelResult }> => {
      try {
        return { name: channel.name, result: await channel.send(profileId, message) };
      } catch (error) {
        return { name: channel.name, result: { status: "failed", error: errorText(error) } };
      }
    }),
  );

  if (results.some(({ result }) => result.status === "sent")) return { status: "delivered" };

  const problems = results.flatMap(({ name, result }) => {
    if (result.status === "failed") return [`${name}: ${result.error}`];
    if (result.status === "not_configured") return [`${name}: ${result.reason}`];
    return [];
  });
  if (problems.length > 0) return { status: "failed", error: problems.join("; ") };

  return { status: "nothing_to_deliver" };
}
