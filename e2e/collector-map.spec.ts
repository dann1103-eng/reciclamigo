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
  await enterAs(a, "Reciclador");
  await enterAs(b, "Reciclador");

  // Ambos abren el mismo lote (el más cercano).
  await lotItems(a).first().click();
  await lotItems(b).first().click();
  const kg = await a.locator("article p").first().textContent();

  await a.getByRole("button", { name: "Reservar retiro" }).click();
  await expect(a).toHaveURL(/\/reciclador\/retiros$/);

  await b.getByRole("button", { name: "Reservar retiro" }).click();
  await expect(b.getByText("El lote ya no está disponible")).toBeVisible();
  await expect(b.getByRole("button", { name: "Reservar retiro" })).toBeHidden(); // vuelve a la lista
  expect(kg).toBeTruthy();
});

test("la ficha permite escribirle al comercio por WhatsApp con el mensaje listo", async ({ page }) => {
  await enterAs(page, "Reciclador");
  await lotItems(page).first().click();
  const link = page.getByRole("link", { name: /^Contactar por WhatsApp/ });
  await expect(link).toHaveAttribute("target", "_blank");
  const href = (await link.getAttribute("href")) ?? "";
  expect(href).toMatch(/^https:\/\/wa\.me\/5037\d{7}\?text=/);
  const text = decodeURIComponent(href.split("?text=")[1]);
  expect(text).toMatch(/^Hola, soy Don José de Reciclamigo\. Voy por tu lote de .+ kg de (PET|HDPE|LDPE|PP|PS) \(.+\)\.$/);
});
