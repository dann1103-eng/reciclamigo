import { describe, expect, test } from "vitest";

import { messageFor } from "./messages";
import type { NotifyEvent } from "./types";

const LOT = "11111111-1111-4111-8111-111111111111";
const PICKUP = "22222222-2222-4222-8222-222222222222";

const EVENTS: NotifyEvent[] = [
  { type: "lote_cercano", lotId: LOT, polymerCode: "PET", estimatedLb: 100, generatorName: "Comedor La Ceiba", distanceM: 1500 },
  { type: "lote_reservado", lotId: LOT, pickupId: PICKUP, polymerCode: "HDPE", estimatedLb: 250 },
  { type: "entrega_propuesta", pickupId: PICKUP, lotId: LOT, proposedLb: 95.5 },
  { type: "entrega_confirmada", pickupId: PICKUP, lotId: LOT, confirmedLb: 98, voucherCode: "RCA-2026-0A1B2C" },
  { type: "reserva_liberada", lotId: LOT, reason: "generador" },
  { type: "reserva_liberada", lotId: LOT, reason: "reciclador" },
  { type: "reserva_liberada", lotId: LOT, reason: "automatica" },
  { type: "plan_activado" },
];

describe("messageFor", () => {
  test("lote_cercano: título con tipo y distancia, cuerpo con comercio y libras (con quintales)", () => {
    const message = messageFor(EVENTS[0]);
    expect(message.title).toBe("Lote de PET a 1.5 km");
    expect(message.body).toBe("Comedor La Ceiba · 100 lb (1 qq)");
    expect(message.url).toBe(`/reciclador?lote=${LOT}`);
  });

  test("lote_cercano: menos de un kilómetro va en metros; sin distancia dice 'cerca de ti'", () => {
    expect(messageFor({ ...(EVENTS[0] as Extract<NotifyEvent, { type: "lote_cercano" }>), distanceM: 850 }).title).toBe(
      "Lote de PET a 850 m",
    );
    const sinDistancia = messageFor({
      ...(EVENTS[0] as Extract<NotifyEvent, { type: "lote_cercano" }>),
      distanceM: null,
      generatorName: null,
      estimatedLb: 40,
    });
    expect(sinDistancia.title).toBe("Lote de PET cerca de ti");
    expect(sinDistancia.body).toBe("Un comercio · 40 lb");
  });

  test("lote_reservado: libras con quintales y lleva al comercio a su pantalla", () => {
    const message = messageFor(EVENTS[1]);
    expect(message.title).toBe("Reservaron tu lote de HDPE");
    expect(message.body).toContain("250 lb (2.5 qq)");
    expect(message.url).toBe("/comercio");
  });

  test("entrega_propuesta: pide aceptar o corregir y lleva a los retiros", () => {
    const message = messageFor(EVENTS[2]);
    expect(message.title).toBe("Confirma la entrega");
    expect(message.body).toContain("95.5 lb");
    expect(message.body).toMatch(/Acéptala o corrígela/);
    expect(message.url).toBe("/reciclador/retiros");
  });

  test("entrega_confirmada: menciona el comprobante y su código", () => {
    const message = messageFor(EVENTS[3]);
    expect(message.title).toBe("Entrega confirmada");
    expect(message.body).toContain("98 lb");
    expect(message.body).toContain("comprobante RCA-2026-0A1B2C");
    expect(message.url).toBe("/comercio");
  });

  test("reserva_liberada: el texto cambia con el motivo y lleva a /inicio", () => {
    const [porComercio, porReciclador, automatica] = EVENTS.slice(4, 7).map(messageFor);
    expect(porComercio.body).toMatch(/comercio liberó/);
    expect(porReciclador.body).toMatch(/reciclador soltó/);
    expect(automatica.body).toMatch(/plazo/);
    for (const message of [porComercio, porReciclador, automatica]) {
      expect(message.title).toBe("Reserva liberada");
      expect(message.url).toBe("/inicio");
    }
  });

  test("plan_activado lleva a la pantalla del plan", () => {
    const message = messageFor(EVENTS[7]);
    expect(message.title).toBe("Tu Plan Trazabilidad está activo");
    expect(message.url).toBe("/comercio/plan");
  });

  test("ningún aviso usa 'certificado' ni kilos", () => {
    for (const event of EVENTS) {
      const { title, body } = messageFor(event);
      expect(`${title} ${body}`).not.toMatch(/certific/i);
      expect(`${title} ${body}`).not.toMatch(/\bkg\b|kilo/i);
    }
  });

  test("todos traen título, cuerpo, url interna y una etiqueta (tag) estable", () => {
    for (const event of EVENTS) {
      const message = messageFor(event);
      expect(message.title.length).toBeGreaterThan(0);
      expect(message.body.length).toBeGreaterThan(0);
      expect(message.url.startsWith("/")).toBe(true);
      expect(message.tag.length).toBeGreaterThan(0);
      expect(messageFor(event).tag).toBe(message.tag);
    }
  });

  test("la etiqueta separa tipos de aviso del mismo lote, pero repite para el mismo aviso", () => {
    const tags = [EVENTS[0], EVENTS[1], EVENTS[2], EVENTS[3], EVENTS[4], EVENTS[7]].map((event) => messageFor(event).tag);
    expect(new Set(tags).size).toBe(tags.length);
    // Las dos liberaciones del mismo lote comparten etiqueta: la segunda reemplaza a la primera.
    expect(messageFor(EVENTS[4]).tag).toBe(messageFor(EVENTS[5]).tag);
  });

  test("el id del lote se codifica en la url", () => {
    const message = messageFor({ ...(EVENTS[0] as Extract<NotifyEvent, { type: "lote_cercano" }>), lotId: "a b&c" });
    expect(message.url).toBe("/reciclador?lote=a%20b%26c");
  });
});
