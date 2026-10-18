import { expect, type APIRequestContext, type Page } from "@playwright/test";

/** Entra con una cuenta demo desde /entrar. */
export async function enterAs(page: Page, role: "Comercio" | "Reciclador") {
  await page.goto("/entrar");
  await page.getByRole("button", { name: new RegExp(`^${role}`) }).click();
  await expect(page).toHaveURL(role === "Comercio" ? /\/comercio$/ : /\/reciclador$/);
}

/** Restaura los datos del demo (las pruebas que reservan o publican dejan cambios). */
export async function resetDemo(request: APIRequestContext) {
  const token = process.env.DEMO_RESET_TOKEN;
  if (!token) throw new Error("Falta DEMO_RESET_TOKEN para reiniciar el demo");
  const res = await request.post(`/demo/reset?token=${encodeURIComponent(token)}`);
  expect(res.status()).toBe(200);
}
