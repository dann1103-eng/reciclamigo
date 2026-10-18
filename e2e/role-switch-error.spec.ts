import { expect, test } from "@playwright/test";

// Si el cambio de rol falla (red caída, Supabase en pausa), el demo no puede caerse:
// se queda en la pantalla actual y muestra un mensaje.
test("un cambio de rol fallido muestra un aviso y no tumba la página", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByRole("button", { name: /^Comercio/ }).click();
  await page.waitForURL("**/comercio");
  await expect(page.getByRole("heading", { name: "Comedor La Ceiba" })).toBeVisible();

  // A partir de aquí, toda llamada a server actions (POST) falla por red.
  await page.route("**/*", (route) => (route.request().method() === "POST" ? route.abort() : route.continue()));
  await page.getByRole("button", { name: "Reciclador" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "No se pudo cambiar de cuenta" })).toBeVisible();
  await expect(page).toHaveURL(/\/comercio$/);
  await expect(page.getByRole("heading", { name: "Comedor La Ceiba" })).toBeVisible();
});
