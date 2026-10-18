import { expect, test } from "@playwright/test";

test("entrar, cambiar de rol, ver reportes y salir", async ({ page }) => {
  await page.goto("/comercio");
  await expect(page).toHaveURL(/\/entrar$/);

  await page.getByRole("button", { name: /^Comercio/ }).click();
  await expect(page).toHaveURL(/\/comercio$/);
  await expect(page.getByRole("button", { name: "Comercio" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Reciclador" }).click();
  await expect(page).toHaveURL(/\/reciclador$/);
  await expect(page.getByRole("button", { name: "Reciclador" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Reportes" }).click();
  await expect(page).toHaveURL(/\/alcaldia$/);
  await expect(page.locator("[aria-current=page]")).toContainText("Reportes");

  // La alcaldía no puede entrar a las áreas operativas.
  await page.goto("/comercio");
  await expect(page).toHaveURL(/\/alcaldia$/);

  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
});
