import { expect, test } from "@playwright/test";

import { enterAs, resetDemo } from "./helpers";

// Reserva lotes reales: reinicia el demo antes y después.
test.describe.configure({ mode: "serial" });
test.beforeAll(async ({ request }) => resetDemo(request));
test.afterAll(async ({ request }) => resetDemo(request));

const pins = (page: import("@playwright/test").Page) => page.locator(".leaflet-marker-icon");
const lotItems = (page: import("@playwright/test").Page) => page.getByRole("list").getByRole("button");

test("el radio y el filtro de plástico cambian los lotes del mapa", async ({ page }) => {
  await enterAs(page, "Reciclador");
  await expect(pins(page).first()).toBeVisible();
  const at3 = await lotItems(page).count();

  await page.getByRole("radio", { name: "1 km" }).click();
  await expect(page.getByText(/a 1 km$/)).toBeVisible();
  const at1 = await lotItems(page).count();
  expect(at1).toBeLessThan(at3);

  await page.getByRole("radio", { name: "5 km" }).click();
  await expect(page.getByText(/a 5 km$/)).toBeVisible();
  expect(await lotItems(page).count()).toBeGreaterThan(at3);

  await page.getByRole("group", { name: "Tipo de plástico" }).getByRole("button", { name: /PET/ }).click();
  await expect(page.getByText("Buscando…")).toBeHidden();
  const items = lotItems(page);
  const n = await items.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) await expect(items.nth(i)).toContainText("PET");
  await expect(pins(page)).toHaveCount(n);
});

test("sin lotes en el radio muestra cómo ampliar la búsqueda", async ({ page }) => {
  await enterAs(page, "Reciclador");
  await page.getByRole("radio", { name: "1 km" }).click();
  await expect(page.getByText(/a 1 km$/)).toBeVisible();

  // Filtra por un plástico que no aparezca a 1 km (los datos sembrados son fijos, pero no lo asumimos).
  const present = (await lotItems(page).allTextContents()).join(" ");
  const missing = ["PS", "PP", "LDPE", "HDPE", "PET"].find((code) => !present.includes(code));
  expect(missing).toBeTruthy();
  await page.getByRole("group", { name: "Tipo de plástico" }).getByRole("button", { name: missing, exact: true }).click();

  await expect(page.getByText("No hay lotes a 1 km")).toBeVisible();
  await page.getByRole("button", { name: "Ver a 5 km" }).click();
  await expect(page.getByRole("radio", { name: "5 km" })).toHaveAttribute("aria-checked", "true");
});

test("reservar lleva a Mis retiros y un segundo intento sobre el mismo lote falla", async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  // WhatsApp se abre al reservar: no hace falta salir a internet.
  for (const page of [a, b]) {
    await page.context().route("https://wa.me/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "ok" }));
  }
  await enterAs(a, "Reciclador");
  await enterAs(b, "Reciclador");

  // Ambos abren el mismo lote (el más cercano).
  await lotItems(a).first().click();
  await lotItems(b).first().click();
  const weight = await a.locator("article p").first().textContent();

  await a.getByRole("button", { name: /^Reservar/ }).click();
  await expect(a).toHaveURL(/\/reciclador\/retiros$/);

  await b.getByRole("button", { name: /^Reservar/ }).click();
  await expect(b.getByText("El lote ya no está disponible")).toBeVisible();
  await expect(b.getByRole("button", { name: /^Reservar/ })).toBeHidden(); // vuelve a la lista
  expect(weight).toMatch(/lb/);
});

test("reservar abre WhatsApp con el mensaje listo: código del lote, plástico, libras y enlace al lote", async ({ page }) => {
  await page.context().route("https://wa.me/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "ok" }));
  await enterAs(page, "Reciclador");
  await lotItems(page).first().click();
  const whatsapp = page.context().waitForEvent("page");
  await page.getByRole("button", { name: /^Reservar/ }).click();
  const url = (await whatsapp).url();
  expect(url).toMatch(/^https:\/\/wa\.me\/5037\d{7}\?text=/); // número en formato +503
  const text = decodeURIComponent(url.split("?text=")[1]);
  expect(text).toMatch(
    /^Hola, soy Don José de Reciclamigo\. Reservé tu lote L-[0-9A-F]{6}: .+ lb.* de (PET|HDPE|LDPE|PP|PS) \(.+\)\. Míralo aquí: .+\/lote\/[0-9a-f-]{36}$/,
  );
});
