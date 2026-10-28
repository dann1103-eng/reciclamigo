import { describe, expect, test } from "vitest";

import { historyRowFromRpc, historyStatusDetail, historyStatusLabel, modalityLabel, type HistoryRow } from "./history";

const completed: HistoryRow = {
  lotId: "lot-1",
  pickupId: "pk-1",
  polymerCode: "PET",
  modality: "venta",
  status: "completado",
  estimatedLb: 120,
  confirmedLb: 118.5,
  totalAmount: 10.67,
  createdAt: "2026-10-03T15:00:00Z",
  completedAt: "2026-10-05T16:00:00Z",
  collectorName: "Don José",
  voucherCode: "RCA-2026-AAA111",
};

describe("historyRowFromRpc", () => {
  test("convierte los numéricos (a veces llegan como texto) y conserva los nulos", () => {
    const row = historyRowFromRpc({
      lot_id: "lot-1",
      pickup_id: null,
      polymer_code: "HDPE",
      modality: "donacion",
      status: "publicado",
      estimated_lb: "88.5" as unknown as number,
      confirmed_lb: null,
      total_amount: null,
      created_at: "2026-10-03T15:00:00Z",
      completed_at: null,
      collector_name: null,
      voucher_code: null,
    });
    expect(row).toEqual({
      lotId: "lot-1",
      pickupId: null,
      polymerCode: "HDPE",
      modality: "donacion",
      status: "publicado",
      estimatedLb: 88.5,
      confirmedLb: null,
      totalAmount: null,
      createdAt: "2026-10-03T15:00:00Z",
      completedAt: null,
      collectorName: null,
      voucherCode: null,
    });
  });
});

describe("estado en palabras llanas", () => {
  test("etiqueta corta de cada estado", () => {
    expect(historyStatusLabel("publicado")).toBe("Esperando reciclador");
    expect(historyStatusLabel("reservado")).toBe("Reservado");
    expect(historyStatusLabel("entregado")).toBe("Por confirmar");
    expect(historyStatusLabel("completado")).toBe("Confirmado");
    expect(historyStatusLabel("cancelado")).toBe("Cancelado");
  });

  test("el detalle nombra al reciclador cuando lo hay", () => {
    expect(historyStatusDetail({ ...completed, status: "reservado" })).toBe("Reservado por Don José");
    expect(historyStatusDetail({ ...completed, status: "entregado" })).toBe("Registraste la entrega. Don José la acepta o la corrige");
    expect(historyStatusDetail(completed)).toBe("Recogido por Don José");
  });

  test("sin reciclador usa palabras genéricas", () => {
    const none = { ...completed, collectorName: null };
    expect(historyStatusDetail({ ...none, status: "publicado" })).toBe("Esperando reciclador");
    expect(historyStatusDetail({ ...none, status: "reservado" })).toBe("Reservado");
    expect(historyStatusDetail({ ...none, status: "entregado" })).toBe("Registraste la entrega. El reciclador la acepta o la corrige");
    expect(historyStatusDetail({ ...none, status: "cancelado" })).toBe("Cancelado");
  });
});

describe("modalityLabel", () => {
  test("nombra la modalidad", () => {
    expect(modalityLabel("venta")).toBe("Venta");
    expect(modalityLabel("trueque")).toBe("Trueque");
    expect(modalityLabel("donacion")).toBe("Donación");
  });
});
