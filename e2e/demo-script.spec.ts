import { expect, test } from "@playwright/test";

import { resetDemo } from "./helpers";

// El guion del demo en vivo: una sola pantalla que cambia de rol.
// Pasos 8 y 9 del plan (tablero de impacto y vista de alcaldía) se agregan cuando se fusione el Track B.
test.describe.configure({ mode: "serial" });
test.beforeAll(async ({ request }) => resetDemo(request));
test.afterAll(async ({ request }) => resetDemo(request));

test("guion: publicar, reservar, entregar, confirmar kg, calificar y verificar el certificado", async ({ page, browser }) => {
  await test.step("el comercio publica 40 kg de PET con una foto", async () => {
    await page.goto("/entrar");
    await page.getByRole("button", { name: /^Comercio/ }).click();
    await expect(page).toHaveURL(/\/comercio$/);
    await page.getByRole("link", { name: "Publicar lote" }).click();
    await page.getByRole("button", { name: /^PET/ }).click();
    await page.getByLabel("Kilogramos estimados").fill("40");
    await page.locator("input[type=file]").setInputFiles("e2e/fixtures/botella-pet.png");
    await page.getByRole("button", { name: "Publicar lote" }).click();
    await expect(page).toHaveURL(/\/comercio$/);
    await expect(page.getByText("Lote publicado")).toBeVisible();
  });

  await test.step("Don José ve ese lote en el mapa y lo reserva", async () => {
    await page.getByRole("button", { name: "Reciclador" }).click();
    await expect(page).toHaveURL(/\/reciclador$/);
    const lot = page.getByRole("list").getByRole("button").filter({ hasText: "Comedor La Ceiba" }).filter({ hasText: "40 kg" });
    await expect(lot).toHaveCount(1);
    await expect(lot).toContainText("PET");
    await lot.click();
    await expect(page.getByRole("img", { name: /Foto del lote/ })).toBeVisible();
    await page.getByRole("button", { name: "Reservar retiro" }).click();
    await expect(page).toHaveURL(/\/reciclador\/retiros$/);
  });

  await test.step("el comercio ve la reserva y marca la entrega", async () => {
    await page.getByRole("button", { name: "Comercio" }).click();
    await expect(page).toHaveURL(/\/comercio$/);
    const row = page.getByRole("listitem").filter({ hasText: "Don José reservó tu lote: pasa" });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Marcar como entregado" }).click();
    await expect(page.getByText("Entregado, esperando la confirmación de kg")).toBeVisible();
  });

  await test.step("Don José confirma 35,5 kg en efectivo", async () => {
    await page.getByRole("button", { name: "Reciclador" }).click();
    await expect(page).toHaveURL(/\/reciclador$/);
    await page.getByRole("link", { name: /^Mis retiros/ }).click();
    await expect(page).toHaveURL(/\/reciclador\/retiros$/);
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

  await test.step("el certificado se verifica sin sesión y cabe en una hoja A4", async () => {
    await page.getByRole("button", { name: "Reciclador" }).click();
    await expect(page).toHaveURL(/\/reciclador$/); // espera a que termine el cambio de cuenta
    await page.getByRole("link", { name: /^Mis retiros/ }).click();
    await expect(page).toHaveURL(/\/reciclador\/retiros$/);
    const href = await page
      .getByRole("listitem")
      .filter({ hasText: "Calificaste a Comedor La Ceiba con 5 ★" })
      .filter({ hasText: "35.5 kg" })
      .getByRole("link", { name: "Ver certificado" })
      .getAttribute("href");
    expect(href).toMatch(/^\/certificados\/RCA-\d{4}-[0-9A-F]{6}$/);

    const visitor = await (await browser.newContext()).newPage(); // sin sesión
    await visitor.goto(href!);
    await expect(visitor.getByRole("heading", { name: "Certificado de manejo de residuos plásticos" })).toBeVisible();
    await expect(visitor.getByText("Versión piloto")).toBeVisible();
    await expect(visitor.getByText("35.5 kg", { exact: true })).toBeVisible();
    await expect(visitor.getByText("71 kg", { exact: true })).toBeVisible(); // CO2e = 35.5 × 2
    await expect(visitor.getByText("Comedor La Ceiba")).toBeVisible();
    await expect(visitor.getByRole("img", { name: /Código QR/ })).toBeVisible();

    // A4 menos márgenes de 16 mm ≈ 673 × 1001 px a 96 ppp.
    await visitor.setViewportSize({ width: 673, height: 1001 });
    await visitor.emulateMedia({ media: "print" });
    const height = await visitor.locator("article").evaluate((el) => el.getBoundingClientRect().height);
    expect(height).toBeLessThanOrEqual(1001);
    await expect(visitor.getByRole("button", { name: "Imprimir / Guardar PDF" })).toBeHidden();
  });
});

test("un código de certificado inexistente o mal escrito da 404 amable", async ({ page }) => {
  for (const code of ["RCA-2026-XXXXXX", "RCA-2026-000000"]) {
    const res = await page.goto(`/certificados/${code}`);
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Certificado no encontrado" })).toBeVisible();
  }
});
