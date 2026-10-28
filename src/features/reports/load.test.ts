import { describe, expect, test, vi } from "vitest";

import { loadHistory, loadMonthlyReport } from "./load";

const reportRow = {
  voucher_code: "RCA-2026-AAA111",
  completed_at: "2026-10-03T15:00:00Z",
  collector_name: "Don José",
  polymer_code: "PET",
  modality: "venta" as const,
  confirmed_lb: "95.5" as unknown as number,
  total_amount: 8.6,
};

describe("loadMonthlyReport", () => {
  test("pide el mes a la base como el primer día y convierte las filas", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [reportRow], error: null });
    const result = await loadMonthlyReport({ rpc }, "2026-10");
    expect(rpc).toHaveBeenCalledWith("monthly_report", { p_month: "2026-10-01" });
    expect(result).toEqual({
      ok: true,
      rows: [{ voucherCode: "RCA-2026-AAA111", completedAt: "2026-10-03T15:00:00Z", collectorName: "Don José", polymerCode: "PET", confirmedLb: 95.5 }],
    });
  });

  test("un mes sin entregas es una lista vacía, no un error", async () => {
    const result = await loadMonthlyReport({ rpc: async () => ({ data: null, error: null }) }, "2026-09");
    expect(result).toEqual({ ok: true, rows: [] });
  });

  test("sin plan, la base responde requiere_plan y se conserva el mensaje en español", async () => {
    const error = { message: "El reporte mensual de trazabilidad es parte del Plan Trazabilidad", hint: "requiere_plan" };
    const result = await loadMonthlyReport({ rpc: async () => ({ data: null, error }) }, "2026-10");
    expect(result).toEqual({ ok: false, error: error.message, code: "requiere_plan" });
  });

  test("otros errores de la base se pasan tal cual, sin código", async () => {
    const result = await loadMonthlyReport({ rpc: async () => ({ data: null, error: { message: "Solo los comercios tienen reporte", hint: null } }) }, "2026-10");
    expect(result).toEqual({ ok: false, error: "Solo los comercios tienen reporte" });
  });
});

describe("loadHistory", () => {
  const historyRow = {
    lot_id: "lot-1",
    pickup_id: "pk-1",
    polymer_code: "PET",
    modality: "venta" as const,
    status: "completado" as const,
    estimated_lb: 120,
    confirmed_lb: 95.5,
    total_amount: 8.6,
    created_at: "2026-10-03T15:00:00Z",
    completed_at: "2026-10-05T16:00:00Z",
    collector_name: "Don José",
    voucher_code: "RCA-2026-AAA111",
  };

  test("trae el historial sin filtros y lo convierte", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [historyRow], error: null });
    const result = await loadHistory({ rpc });
    expect(rpc).toHaveBeenCalledWith("generator_history", {});
    expect(result.ok && result.rows[0]).toMatchObject({ lotId: "lot-1", confirmedLb: 95.5, voucherCode: "RCA-2026-AAA111" });
  });

  test("devuelve el error de la base tal cual", async () => {
    const result = await loadHistory({ rpc: async () => ({ data: null, error: { message: "Solo los comercios tienen historial" } }) });
    expect(result).toEqual({ ok: false, error: "Solo los comercios tienen historial" });
  });
});
