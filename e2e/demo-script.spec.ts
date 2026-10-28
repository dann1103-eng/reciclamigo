import { expect, test } from "@playwright/test";

import { resetDemo } from "./helpers";

// El guion del demo en vivo: una sola pantalla que cambia de rol.
// Pasos 8 y 9 del plan (tablero de impacto y vista de alcaldía) se agregan cuando se fusione el Track B.
test.describe.configure({ mode: "serial" });
test.beforeAll(async ({ request }) => resetDemo(request));
test.afterAll(async ({ request }) => resetDemo(request));

test("guion: publicar, reservar, registrar la entrega, corregir y confirmar, calificar y verificar el comprobante", async ({ page, browser }) => {
  // WhatsApp se abre en otra pestaña al reservar: aquí solo comprobamos a dónde iría.
  await page.context().route("https://wa.me/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "ok" }));

  await test.step("el comercio publica 90 lb de PET con una foto", async () => {
    await page.goto("/entrar");
    await page.getByRole("button", { name: /^Comercio/ }).click();
    await expect(page).toHaveURL(/\/comercio$/);
    await page.getByRole("link", { name: "Publicar lote" }).click();
    await page.getByRole("button", { name: /^PET/ }).click();
    await page.getByLabel("Libras estimadas").fill("90");
    await page.locator("input[type=file]").setInputFiles("e2e/fixtures/botella-pet.png");
    await page.getByRole("button", { name: "Publicar lote" }).click();
    await expect(page).toHaveURL(/\/comercio$/);
    await expect(page.getByText("Lote publicado")).toBeVisible();
  });

  await test.step("Don José ve ese lote en el mapa y lo reserva: se abre WhatsApp con el mensaje listo", async () => {
    await page.getByRole("button", { name: "Reciclador" }).click();
    await expect(page).toHaveURL(/\/reciclador$/);
    const lot = page.getByRole("list").getByRole("button").filter({ hasText: "Comedor La Ceiba" }).filter({ hasText: "90 lb" });
    await expect(lot).toHaveCount(1);
    await expect(lot).toContainText("PET");
    await lot.click();
    await expect(page.getByRole("img", { name: /Foto del lote/ })).toBeVisible();
    const whatsapp = page.context().waitForEvent("page");
    await page.getByRole("button", { name: /^Reservar/ }).click();
    await expect(page).toHaveURL(/\/reciclador\/retiros$/);
    const url = (await whatsapp).url();
    expect(url).toMatch(/^https:\/\/wa\.me\/5037\d{7}\?text=/);
    expect(decodeURIComponent(url.split("?text=")[1])).toMatch(
      /^Hola, soy Don José de Reciclamigo\. Reservé tu lote L-[0-9A-F]{6}: 90 lb de PET \(.+\)\. Míralo aquí: .+\/lote\/[0-9a-f-]{36}$/,
    );
  });

  await test.step("el comercio ve la reserva y registra la entrega con 95 lb", async () => {
    await page.getByRole("button", { name: "Comercio" }).click();
    await expect(page).toHaveURL(/\/comercio$/);
    const row = page.getByRole("listitem").filter({ hasText: "Don José reservó tu lote: pasa" });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Registrar entrega" }).click();
    await row.getByLabel("Libras reales").fill("95");
    await row.getByRole("button", { name: "Registrar", exact: true }).click();
    await expect(page.getByText("Registraste 95 lb. Esperando que Don José acepte o corrija")).toBeVisible();
  });

  await test.step("Don José corrige a 94 lb y confirma en efectivo: solo ahora cuenta la entrega", async () => {
    await page.getByRole("button", { name: "Reciclador" }).click();
    await expect(page).toHaveURL(/\/reciclador$/);
    await page.getByRole("link", { name: /^Mis retiros/ }).click();
    await expect(page).toHaveURL(/\/reciclador\/retiros$/);
    const row = page.getByRole("listitem").filter({ hasText: "Comedor La Ceiba" }).filter({ hasText: "registró la entrega" });
    await expect(row.getByRole("button", { name: "Aceptar 95 lb" })).toBeVisible();
    await row.getByRole("button", { name: "Corregir" }).click();
    await row.getByLabel("Libras reales pesadas").fill("94");
    await row.getByLabel("Efectivo con comprobante").check();
    await row.getByRole("button", { name: "Confirmar con mis datos" }).click();
    await expect(page).toHaveURL(/completado=/);
    await expect(page.getByRole("status").filter({ hasText: "Entrega confirmada: 94 lb" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Entrega confirmada" }).getByRole("link", { name: "Ver comprobante" })).toBeVisible();
  });

  await test.step("ambos se califican una sola vez", async () => {
    const mine = page.getByRole("listitem").filter({ hasText: "Entrega confirmada" });
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

  await test.step("el comprobante se verifica sin sesión y cabe en una hoja A4", async () => {
    await page.getByRole("button", { name: "Reciclador" }).click();
    await expect(page).toHaveURL(/\/reciclador$/); // espera a que termine el cambio de cuenta
    await page.getByRole("link", { name: /^Mis retiros/ }).click();
    await expect(page).toHaveURL(/\/reciclador\/retiros$/);
    const href = await page
      .getByRole("listitem")
      .filter({ hasText: "Calificaste a Comedor La Ceiba con 5 ★" })
      .filter({ hasText: "94 lb" })
      .getByRole("link", { name: "Ver comprobante" })
      .getAttribute("href");
    expect(href).toMatch(/^\/comprobantes\/RCA-\d{4}-[0-9A-F]{6}$/);

    const visitor = await (await browser.newContext()).newPage(); // sin sesión
    await visitor.goto(href!);
    await expect(visitor.getByRole("heading", { name: "Comprobante de entrega de plástico" })).toBeVisible();
    await expect(visitor.getByText("Versión piloto").first()).toBeVisible();
    await expect(visitor.getByText("94 lb", { exact: true })).toBeVisible();
    await expect(visitor.getByText("42.6 kg", { exact: true })).toBeVisible(); // 94 lb en kg
    await expect(visitor.getByText("85.3 kg", { exact: true })).toBeVisible(); // CO₂ = 42.6 kg × 2.0
    await expect(visitor.getByText("Comedor La Ceiba")).toBeVisible();
    await expect(visitor.getByRole("img", { name: /Código QR/ })).toBeVisible();
    await expect(visitor.getByText(/certificad/i)).toHaveCount(0);

    // A4 menos márgenes de 16 mm ≈ 673 × 1001 px a 96 ppp.
    await visitor.setViewportSize({ width: 673, height: 1001 });
    await visitor.emulateMedia({ media: "print" });
    const height = await visitor.locator("article").evaluate((el) => el.getBoundingClientRect().height);
    expect(height).toBeLessThanOrEqual(1001);
    await expect(visitor.getByRole("button", { name: "Imprimir / Guardar PDF" })).toBeHidden();
  });
});

test("un código de comprobante inexistente o mal escrito da 404 amable", async ({ page }) => {
  for (const code of ["RCA-2026-XXXXXX", "RCA-2026-000000"]) {
    const res = await page.goto(`/comprobantes/${code}`);
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Comprobante no encontrado" })).toBeVisible();
  }
});

test("los enlaces y QR anteriores de /certificados siguen funcionando", async ({ page }) => {
  await page.goto("/certificados/RCA-2026-000000");
  await expect(page).toHaveURL(/\/comprobantes\/RCA-2026-000000$/);
  await expect(page.getByRole("heading", { name: "Comprobante no encontrado" })).toBeVisible();
});
