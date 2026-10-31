// Capturas de pantalla de Reciclamigo con calidad de presentación (solo lectura).
//
//   node docs/presentacion/capturas/capturar.mjs              -> todas
//   node docs/presentacion/capturas/capturar.mjs m-mapa d-plan -> solo esas
//
// Requiere el servidor de desarrollo corriendo (BASE_URL, por defecto http://localhost:3100).
// Entra con los botones de cuenta demo de /entrar; las sesiones viven solo en memoria
// (no se escribe ninguna credencial ni cookie en disco). No envía formularios ni pulsa
// acciones que escriban en la base compartida.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "../assets/screens");
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

// Oculta el indicador de desarrollo de Next y los avisos (toasts) para que la captura salga limpia.
const CLEAN_CSS = `
  nextjs-portal, [data-nextjs-toast], [data-nextjs-dev-tools-button], [data-next-badge-root],
  [data-nextjs-dialog-overlay], [data-sonner-toaster], [data-sonner-toast] { display: none !important; }
`;

const ROLE_BUTTON = { comercio: "Comercio", reciclador: "Reciclador", alcaldia: "Reportes de alcaldía", admin: "Administración" };

const findings = []; // cosas raras: errores de consola, requests fallidas, etc.
const log = (...a) => console.log(...a);

const browser = await chromium.launch();
const sessions = {}; // rol -> storageState en memoria

async function login(role) {
  if (sessions[role]) return sessions[role];
  const ctx = await browser.newContext({ viewport: DESKTOP });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: new RegExp(ROLE_BUTTON[role]) }).first().click();
  await page.waitForURL((u) => u.pathname !== "/entrar", { timeout: 90_000 });
  await page.waitForLoadState("networkidle");
  sessions[role] = await ctx.storageState();
  await ctx.close();
  return sessions[role];
}

/** Abre un contexto nuevo (móvil o escritorio), con o sin sesión, listo para capturar. */
async function open(role, kind, label) {
  const mobile = kind === "mobile";
  const ctx = await browser.newContext({
    viewport: mobile ? MOBILE : DESKTOP,
    deviceScaleFactor: 2,
    isMobile: mobile,
    hasTouch: mobile,
    locale: "es-SV",
    timezoneId: "America/El_Salvador",
    colorScheme: "light",
    reducedMotion: "reduce", // sin animaciones: el mapa no vuela, la ficha no se desliza
    storageState: role ? await login(role) : undefined,
  });
  await ctx.addInitScript((css) => {
    const add = () => {
      const style = document.createElement("style");
      style.textContent = css;
      (document.head ?? document.documentElement).appendChild(style);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add);
    else add();
    try {
      localStorage.setItem("reciclamigo:bienvenida-reciclador", "visto"); // sin la bienvenida del reciclador
    } catch {}
  }, CLEAN_CSS);
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") findings.push(`[${label}] consola ${m.type()}: ${m.text().slice(0, 220)}`);
  });
  page.on("pageerror", (e) => findings.push(`[${label}] error de página: ${e.message.slice(0, 220)}`));
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().includes("/_next/")) findings.push(`[${label}] HTTP ${r.status()} ${r.url().slice(0, 140)}`);
  });
  return { ctx, page };
}

/** Espera fuentes, imágenes, mapas (teselas) y que no queden esqueletos de carga. */
async function settle(page, { pause = 900 } = {}) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  // Recorre la página para activar imágenes diferidas y vuelve arriba.
  await page.evaluate(async () => {
    const step = Math.max(300, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page
    .waitForFunction(() => [...document.images].every((i) => i.complete && (i.naturalWidth > 0 || !i.currentSrc)), null, { timeout: 15_000 })
    .catch(() => findings.push(`imágenes sin terminar de cargar en ${page.url()}`));
  const hasMap = await page.locator(".leaflet-container").count();
  if (hasMap) {
    await page
      .waitForFunction(
        () => {
          const tiles = [...document.querySelectorAll(".leaflet-tile")];
          return tiles.length > 0 && tiles.every((t) => t.classList.contains("leaflet-tile-loaded"));
        },
        null,
        { timeout: 40_000 },
      )
      .catch(() => findings.push(`teselas del mapa sin cargar del todo en ${page.url()}`));
  }
  await page
    .waitForFunction(() => !document.querySelector('.animate-pulse, [aria-busy="true"]'), null, { timeout: 10_000 })
    .catch(() => findings.push(`posible esqueleto de carga visible en ${page.url()}`));
  await page.waitForTimeout(pause);
}

async function goto(page, route, opts) {
  await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 90_000 });
  await settle(page, opts);
}

const shot = (page, name, opts = {}) =>
  page.screenshot({ path: path.join(OUT, name), animations: "disabled", caret: "hide", ...opts });

/** Lleva un elemento cerca de la parte alta de la ventana (bajo la barra fija) y confirma que quedó ahí (reintenta si la app lo mueve). */
async function scrollTo(page, locator, offset = 84) {
  const handle = await locator.first().elementHandle();
  for (let attempt = 1; attempt <= 4; attempt++) {
    await handle.evaluate((el, off) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - off, behavior: "instant" }), offset);
    await page.waitForTimeout(500);
    const top = await handle.evaluate((el) => el.getBoundingClientRect().top);
    if (Math.abs(top - offset) < 3) return;
  }
  findings.push(`el scroll no llegó a la posición pedida en ${page.url()}`);
}

/**
 * Captura de la ventana (1440 de ancho) recortada justo después de la última fila/tarjeta completa
 * que cabe, para que no quede ningún elemento cortado a la mitad en el borde inferior.
 * `bottomOf` devuelve la coordenada Y (en px de la ventana, con scroll 0) donde debe terminar.
 */
async function shotCutAfter(page, name, rowSelector, { minHeight = 0 } = {}) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const bottom = await page.evaluate(
    ({ sel, min, vh }) => {
      const ends = [...document.querySelectorAll(sel)]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.height >= min && r.bottom <= vh - 6)
        .map((r) => r.bottom);
      return ends.length ? Math.max(...ends) : vh;
    },
    { sel: rowSelector, min: minHeight, vh: DESKTOP.height },
  );
  const height = Math.min(DESKTOP.height, Math.ceil(bottom + 5));
  await shot(page, name, { clip: { x: 0, y: 0, width: DESKTOP.width, height } });
}

// ---------------------------------------------------------------------------------------------
// Capturas
// ---------------------------------------------------------------------------------------------
const SHOTS = {
  async "m-publicar.png"() {
    const { ctx, page } = await open("comercio", "mobile", "m-publicar");
    await goto(page, "/comercio/publicar");
    // Solo se rellena; NO se envía.
    await page.getByRole("button", { name: /PET/ }).first().click();
    await page.getByPlaceholder("90").fill("90");
    // Sube 112 px: sale la barra de secciones y el campo de libras queda completo.
    await page.evaluate(() => window.scrollTo(0, 112));
    await page.waitForTimeout(500);
    await shot(page, "m-publicar.png");
    await ctx.close();
  },

  async "m-mis-lotes.png"() {
    const { ctx, page } = await open("comercio", "mobile", "m-mis-lotes");
    await goto(page, "/comercio");
    await scrollTo(page, page.getByRole("heading", { name: "Mis lotes" }), 76);
    await shot(page, "m-mis-lotes.png");
    await ctx.close();
  },

  async "m-mapa.png"() {
    const { ctx, page } = await open("reciclador", "mobile", "m-mapa");
    await goto(page, "/reciclador", { pause: 1500 });
    await shot(page, "m-mapa.png");
    await ctx.close();
  },

  async "m-lote.png"() {
    const { ctx, page } = await open("reciclador", "mobile", "m-lote");
    // Averigua qué lote sirve (venta con precio de referencia, con foto, dentro de 3 km) mirando la
    // respuesta de lectura que la propia app pide al ampliar el radio. No escribe nada.
    const lots = [];
    page.on("response", async (r) => {
      if (r.url().includes("/rpc/nearby_lots")) {
        try {
          lots.push(...(await r.json()));
        } catch {}
      }
    });
    await goto(page, "/reciclador");
    await page.getByRole("radio", { name: "5 km" }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1200);
    const pick = lots
      .filter((l) => l.modality === "venta" && Number(l.price_per_lb) > 0 && l.photo_urls?.length > 0 && l.distance_m <= 3000)
      .sort((a, b) => a.distance_m - b.distance_m)[0];
    if (!pick) throw new Error("no hay un lote de venta con precio de referencia y foto dentro de 3 km");
    log(`   lote elegido: ${pick.polymer_code} ${pick.estimated_lb} lb, ${pick.generator_name}`);
    await goto(page, `/reciclador?lote=${pick.id}`, { pause: 1800 });
    // Espera a que la ficha termine de cargar la reputación y las insignias del comercio.
    await page.getByRole("button", { name: /Reservar/ }).waitFor();
    await page.waitForTimeout(1200);
    // El documento termina justo bajo la ficha y no deja subirla más: se agrega aire al final (invisible en la captura).
    await page.addStyleTag({ content: "body { padding-bottom: 240px !important; }" });
    await scrollTo(page, page.locator("aside article"), 40);
    const bottom = await page.locator("aside article").evaluate((el) => el.getBoundingClientRect().bottom);
    log(`   la ficha termina en y=${Math.round(bottom)} de ${MOBILE.height}`);
    if (bottom > MOBILE.height - 12) {
      // Si la ficha no cabe entera, baja lo justo para que el botón de reservar quede a la vista.
      await page.evaluate((d) => window.scrollBy(0, d), bottom - (MOBILE.height - 12));
      await page.waitForTimeout(300);
    }
    await shot(page, "m-lote.png"); // NO se pulsa Reservar
    await ctx.close();
  },

  async "m-retiros.png"() {
    const { ctx, page } = await open("reciclador", "mobile", "m-retiros");
    await goto(page, "/reciclador/retiros");
    await shot(page, "m-retiros.png");
    await ctx.close();
  },

  async "m-comprobante.png"() {
    const { ctx, page } = await open("comercio", "mobile", "m-comprobante");
    await goto(page, "/comercio");
    const href = await page.locator('a[href^="/comprobantes/"]').first().getAttribute("href");
    if (!href) throw new Error("el comercio no tiene comprobantes en su pantalla");
    log(`   comprobante: ${href.split("/").pop()}`);
    await goto(page, href);
    await shot(page, "m-comprobante.png", { fullPage: true });
    await ctx.close();
  },

  async "d-comprobante.png"() {
    // El mismo comprobante, en escritorio: la tarjeta queda ancha y se lee mejor en una lámina.
    const { ctx, page } = await open("comercio", "desktop", "d-comprobante");
    await goto(page, "/comercio");
    const href = await page.locator('a[href^="/comprobantes/"]').first().getAttribute("href");
    if (!href) throw new Error("el comercio no tiene comprobantes en su pantalla");
    await goto(page, href);
    await shot(page, "d-comprobante.png", { fullPage: true });
    await ctx.close();
  },

  async "d-plan.png"() {
    const { ctx, page } = await open("comercio", "desktop", "d-plan");
    await goto(page, "/comercio/plan");
    // La tabla queda justo bajo la barra; se agrega aire al final para que la página permita subirla (invisible en la captura).
    await page.addStyleTag({ content: "body { padding-bottom: 400px !important; }" });
    await scrollTo(page, page.locator("table").first().locator("xpath=.."), 82);
    await shot(page, "d-plan.png");
    await ctx.close();
  },

  async "d-planes-publico.png"() {
    const { ctx, page } = await open(null, "desktop", "d-planes-publico");
    await goto(page, "/planes");
    await shot(page, "d-planes-publico.png", { fullPage: true });
    await ctx.close();
  },

  async "d-reportes.png"() {
    const { ctx, page } = await open("comercio", "desktop", "d-reportes");
    await goto(page, "/comercio/reportes");
    await shotCutAfter(page, "d-reportes.png", 'section[aria-labelledby="meses"] li');
    await ctx.close();
  },

  async "d-impacto.png"() {
    const { ctx, page } = await open("comercio", "desktop", "d-impacto");
    await goto(page, "/comercio");
    await shotCutAfter(page, "d-impacto.png", 'section[aria-labelledby="comercio-circular"]');
    await ctx.close();
  },

  async "d-alcaldia-PLACEHOLDER.png"() {
    const { ctx, page } = await open("alcaldia", "desktop", "d-alcaldia");
    await goto(page, "/alcaldia");
    await shot(page, "d-alcaldia-PLACEHOLDER.png");
    await ctx.close();
  },

  async "d-admin-planes.png"() {
    const { ctx, page } = await open("admin", "desktop", "d-admin-planes");
    await goto(page, "/admin/planes");
    await shotCutAfter(page, "d-admin-planes.png", "main li", { minHeight: 150 });
    await ctx.close();
  },

  async "d-admin-comisiones.png"() {
    const { ctx, page } = await open("admin", "desktop", "d-admin-comisiones");
    // Septiembre y octubre del seed no tienen comisiones. Mayo a agosto traen una compra cada mes;
    // junio (PET, 489.9 lb, $44.09) es la más representativa.
    await goto(page, `/admin/comisiones?mes=${process.env.MES_COMISIONES ?? "2026-06"}`);
    await shot(page, "d-admin-comisiones.png");
    await ctx.close();
  },

  async "d-insignia.png"() {
    // El slug sale de la propia app: el enlace "Ver mi página" de la pantalla del comercio.
    const own = await open("comercio", "desktop", "d-insignia-slug");
    await goto(own.page, "/comercio");
    const href = await own.page.locator('a[href^="/circular/"]:not([href*="/qr"])').first().getAttribute("href");
    await own.ctx.close();
    if (!href) throw new Error("no se encontró el enlace a la insignia pública");
    log(`   insignia: ${href}`);
    const { ctx, page } = await open(null, "desktop", "d-insignia");
    await goto(page, href);
    await shot(page, "d-insignia.png", { fullPage: true });
    await ctx.close();
  },

  async "d-portada.png"() {
    const { ctx, page } = await open(null, "desktop", "d-portada");
    await goto(page, "/", { pause: 1500 });
    // La franja "Metas del piloto" (cifras viejas) queda fuera con un recorte que termina donde empieza el pie.
    const footerTop = await page.locator("footer").first().evaluate((el) => Math.floor(el.getBoundingClientRect().top + window.scrollY));
    await shot(page, "d-portada.png", { clip: { x: 0, y: 0, width: DESKTOP.width, height: footerTop } });
    await ctx.close();
  },

  async "reporte-pdf.png"() {
    const { ctx } = await open("comercio", "desktop", "reporte-pdf");
    const meses = (process.env.MESES_PDF ?? "2026-10,2026-06").split(",");
    for (const [i, mes] of meses.entries()) {
      const res = await ctx.request.get(`${BASE}/comercio/reportes/${mes}/pdf`);
      if (!res.ok()) throw new Error(`el PDF de ${mes} respondió ${res.status()}: ${(await res.text()).slice(0, 160)}`);
      const pdfPath = path.join(HERE, `reporte-${mes}.pdf`);
      fs.writeFileSync(pdfPath, await res.body());
      const base = i === 0 ? "reporte-pdf" : `reporte-pdf-${mes}`;
      const png = path.join(OUT, `${base}.png`);
      const crop = path.join(OUT, `${base}-recorte.png`);
      const py = [
        "import sys, fitz",
        "doc = fitz.open(sys.argv[1])",
        "page = doc[0]",
        "zoom = 1400 / page.rect.width",
        "m = fitz.Matrix(zoom, zoom)",
        "pix = page.get_pixmap(matrix=m, alpha=False)",
        "pix.save(sys.argv[2])",
        // Recorte: hasta debajo de la última tabla (sin el vacío ni el pie de página).
        "blocks = [b for b in page.get_text('blocks') if b[3] < page.rect.height * 0.85]",
        "bottom = min(max(b[3] for b in blocks) + 36, page.rect.height)",
        "page.get_pixmap(matrix=m, clip=fitz.Rect(0, 0, page.rect.width, bottom), alpha=False).save(sys.argv[3])",
        "print(doc.page_count, int(page.rect.width), int(page.rect.height), pix.width, pix.height)",
      ].join("\n");
      const out = execFileSync("python", ["-I", "-c", py, pdfPath, png, crop], { encoding: "utf8" }).trim();
      log(`   ${mes}: páginas, ancho, alto (pt), px -> ${out}`);
    }
    await ctx.close();
  },
};

// ---------------------------------------------------------------------------------------------
fs.mkdirSync(OUT, { recursive: true });
const wanted = process.argv.slice(2).map((a) => a.replace(/\.png$/, ""));
const names = Object.keys(SHOTS).filter((n) => wanted.length === 0 || wanted.some((w) => n.replace(/\.png$/, "").startsWith(w)));
let failed = 0;
for (const name of names) {
  const before = findings.length;
  try {
    log(`-> ${name}`);
    await SHOTS[name]();
    log(`   ok${findings.length > before ? ` (${findings.length - before} avisos)` : ""}`);
  } catch (e) {
    failed++;
    log(`   FALLÓ: ${e.message.split("\n")[0]}`);
  }
}
await browser.close();
if (findings.length) {
  log("\nAvisos durante la captura:");
  for (const f of [...new Set(findings)]) log(" - " + f);
}
process.exit(failed ? 1 : 0);
