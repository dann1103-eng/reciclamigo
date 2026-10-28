import type { NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";
import { beforeEach, describe, expect, test, vi } from "vitest";

// Las rutas de descarga con sus dependencias del servidor simuladas: sin Next, sin Supabase, sin red.
vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  profile: null as null | { id: string; role: string; displayName: string },
  planActive: true,
  rpc: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionProfile: async () => state.profile }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: state.rpc }) }));
vi.mock("@/lib/settings/load", () => ({ getSettings: async () => ({ co2Factor: 2 }) }));
vi.mock("@/features/plans/load", () => ({ getPlanStatus: async () => ({ active: state.planActive }) }));

import { GET as exportCsv } from "@/app/(areas)/comercio/historial/export/route";
import { GET as reportPdf } from "@/app/(areas)/comercio/reportes/[mes]/pdf/route";

const request = new Request("http://localhost/x") as NextRequest;
const pdfFor = (mes: string) => reportPdf(request, { params: Promise.resolve({ mes }) });

const reportRow = {
  voucher_code: "RCA-2026-AAA111",
  completed_at: "2026-10-03T15:00:00Z",
  collector_name: "Don José",
  polymer_code: "PET",
  modality: "venta",
  confirmed_lb: 95.5,
  total_amount: 8.6,
};

beforeEach(() => {
  state.profile = { id: "u-1", role: "generador", displayName: "Restaurante El Maíz" };
  state.planActive = true;
  state.rpc.mockReset();
  state.rpc.mockResolvedValue({ data: [reportRow], error: null });
});

describe("GET /comercio/reportes/[mes]/pdf", () => {
  test("mes con formato inválido: 400 con el error en español", async () => {
    for (const mes of ["2026-13", "octubre", "2026-1", "2026-10-01"]) {
      const res = await pdfFor(mes);
      expect(res.status, mes).toBe(400);
      expect(((await res.json()) as { error: string }).error).toMatch(/AAAA-MM/);
    }
    expect(state.rpc).not.toHaveBeenCalled();
  });

  test("sin sesión: 401", async () => {
    state.profile = null;
    const res = await pdfFor("2026-10");
    expect(res.status).toBe(401);
    expect(typeof ((await res.json()) as { error: string }).error).toBe("string");
  });

  test("con la sesión de otro rol: 401", async () => {
    state.profile = { id: "u-2", role: "valorizador", displayName: "Don José" };
    expect((await pdfFor("2026-10")).status).toBe(401);
  });

  test("sin plan la base responde requiere_plan: 403 con su mensaje", async () => {
    const message = "El reporte mensual de trazabilidad es parte del Plan Trazabilidad";
    state.rpc.mockResolvedValue({ data: null, error: { message, hint: "requiere_plan" } });
    const res = await pdfFor("2026-10");
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: message });
  });

  test("con plan: PDF descargable con el nombre del mes", async () => {
    const res = await pdfFor("2026-10");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="reporte-trazabilidad-2026-10.pdf"');
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(state.rpc).toHaveBeenCalledWith("monthly_report", { p_month: "2026-10-01" });

    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(Buffer.from(bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
    expect(Number(res.headers.get("Content-Length"))).toBe(bytes.byteLength);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  test("mes sin entregas: PDF válido", async () => {
    state.rpc.mockResolvedValue({ data: [], error: null });
    const res = await pdfFor("2026-09");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("reporte-trazabilidad-2026-09.pdf");
    await expect(PDFDocument.load(new Uint8Array(await res.arrayBuffer()))).resolves.toBeDefined();
  });

  test("un error inesperado de la base: 500 con mensaje, no un PDF roto", async () => {
    state.rpc.mockResolvedValue({ data: null, error: { message: "La base no responde", hint: null } });
    const res = await pdfFor("2026-10");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "La base no responde" });
  });
});

describe("GET /comercio/historial/export", () => {
  const historyRow = {
    lot_id: "lot-1",
    pickup_id: "pk-1",
    polymer_code: "PET",
    modality: "venta",
    status: "completado",
    estimated_lb: 120,
    confirmed_lb: 95.5,
    total_amount: 8.6,
    created_at: "2026-10-03T15:00:00Z",
    completed_at: "2026-10-05T16:00:00Z",
    collector_name: "Don José",
    voucher_code: "RCA-2026-AAA111",
  };

  test("sin sesión: 401", async () => {
    state.profile = null;
    expect((await exportCsv()).status).toBe(401);
  });

  test("sin plan: 403 en español y no consulta el historial", async () => {
    state.planActive = false;
    const res = await exportCsv();
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: string }).error).toMatch(/Plan Trazabilidad/);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  test("con plan: CSV en UTF-8 como descarga", async () => {
    state.rpc.mockResolvedValue({ data: [historyRow], error: null });
    const res = await exportCsv();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toMatch(/^attachment; filename="historial-reciclamigo-\d{4}-\d{2}-\d{2}\.csv"$/);
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // BOM
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain("Tipo de plástico");
    expect(text).toContain("Don José");
    expect(state.rpc).toHaveBeenCalledWith("generator_history", {});
  });

  test("error de la base: 500 con su mensaje", async () => {
    state.rpc.mockResolvedValue({ data: null, error: { message: "Solo los comercios tienen historial" } });
    const res = await exportCsv();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Solo los comercios tienen historial" });
  });
});
