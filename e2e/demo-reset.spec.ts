import { expect, test } from "@playwright/test";

// La página discreta para reiniciar el demo antes de un ensayo o de presentar.
test("con el token en el marcador, un botón reinicia el demo", async ({ page }) => {
  const token = process.env.DEMO_RESET_TOKEN!;
  await page.goto(`/demo?token=${encodeURIComponent(token)}`);
  await expect(page.getByRole("heading", { name: "Reiniciar el demo" })).toBeVisible();
  await page.getByRole("button", { name: "Reiniciar demo" }).click();
  await expect(page.getByRole("status")).toContainText("Demo reiniciado", { timeout: 30_000 });
  await expect(page.getByRole("status")).toContainText("80 lotes");
});

test("con un token equivocado no reinicia nada", async ({ page }) => {
  await page.goto("/demo");
  await page.getByLabel("Token de reinicio").fill("token-equivocado");
  await page.getByRole("button", { name: "Reiniciar demo" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Token incorrecto" })).toBeVisible();
});
