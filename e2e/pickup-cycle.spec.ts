import { expect, test } from "@playwright/test";

import { resetDemo } from "./helpers";

// El ciclo completo entre el comercio demo y Don José, en una sola pantalla que cambia de rol.
test.describe.configure({ mode: "serial" });
test.beforeAll(async ({ request }) => resetDemo(request));
test.afterAll(async ({ request }) => resetDemo(request));

test("reservar, entregar y ver el estado en Mis lotes", async ({ page }) => {
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
});
