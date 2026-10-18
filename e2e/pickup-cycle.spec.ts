import { expect, test } from "@playwright/test";

import { resetDemo } from "./helpers";

// El ciclo completo entre el comercio demo y Don José, en una sola pantalla que cambia de rol.
test.describe.configure({ mode: "serial" });
test.beforeAll(async ({ request }) => resetDemo(request));
test.afterAll(async ({ request }) => resetDemo(request));

test("reservar, entregar, confirmar kg y ver el resultado", async ({ page }) => {
  await test.step("Don José reserva el lote del Comedor La Ceiba", async () => {
    await page.goto("/entrar");
    await page.getByRole("button", { name: /^Reciclador/ }).click();
    await expect(page).toHaveURL(/\/reciclador$/);
    await page.getByRole("list").getByRole("button").filter({ hasText: "Comedor La Ceiba" }).first().click();
    await page.getByRole("button", { name: "Reservar retiro" }).click();
    await expect(page).toHaveURL(/\/reciclador\/retiros$/);
  });

  await test.step("el comercio ve la reserva y marca la entrega", async () => {
    await page.goto("/entrar");
    await page.getByRole("button", { name: /^Comercio/ }).click();
    await expect(page).toHaveURL(/\/comercio$/);
    const row = page.getByRole("listitem").filter({ hasText: "Don José reservó tu lote: pasa" });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Marcar como entregado" }).click();
    await expect(page.getByText("Entregado, esperando la confirmación de kg")).toBeVisible();
  });

  await test.step("Don José confirma 35,5 kg en efectivo", async () => {
    await page.getByRole("button", { name: "Reciclador" }).click();
    await expect(page).toHaveURL(/\/reciclador$/);
    await page.goto("/reciclador/retiros");
    const row = page.getByRole("listitem").filter({ hasText: "Comedor La Ceiba" }).filter({ hasText: "Confirma los kg reales" });
    await row.getByRole("button", { name: "Confirmar retiro" }).click();
    await row.getByLabel("Kg reales pesados").fill("35,5");
    await row.getByLabel("Efectivo con comprobante").check();
    await row.getByRole("button", { name: "Confirmar retiro" }).click();
    await expect(page).toHaveURL(/completado=/);
    await expect(page.getByRole("status").filter({ hasText: "Retiro completado: 35.5 kg" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Retiro completado" }).getByRole("link", { name: "Ver certificado" })).toBeVisible();
  });

  await test.step("ambos se califican una sola vez", async () => {
    const mine = page.getByRole("listitem").filter({ hasText: "Retiro completado" });
    await mine.getByRole("radio", { name: "5 estrellas" }).click();
    await mine.getByLabel("Comentario (opcional)").fill("Material bien separado");
    await mine.getByRole("button", { name: "Enviar calificación" }).click();
    await expect(mine.getByText("Calificaste a Comedor La Ceiba con 5 ★")).toBeVisible();

    await page.getByRole("button", { name: "Comercio" }).click();
    await expect(page).toHaveURL(/\/comercio$/);
    const row = page.getByRole("listitem").filter({ hasText: "Recogido por Don José" }).filter({ hasText: "¿Cómo te fue" }).first();
    await row.getByRole("radio", { name: "4 estrellas" }).click();
    await row.getByRole("button", { name: "Enviar calificación" }).click();
    await expect(page.getByText("Calificaste a Don José con 4 ★").first()).toBeVisible();
  });
});
