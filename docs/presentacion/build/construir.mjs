/* eslint-disable */
// Generador de la presentación de Reciclamigo para DINAMICA FEST 2026.
// Todas las cifras salen del plan de negocios y de marketing v2; nada se inventa aquí.
// Uso: npm install && python -I preparar_marca.py && node construir.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pptxgen from "pptxgenjs";
import QRCode from "qrcode";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as Lu from "react-icons/lu";
import sharp from "sharp";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(AQUI, "..", "assets");
const SALIDA = path.join(AQUI, "..", "Reciclamigo_DINAMICA_FEST_2026.pptx");
const APP_URL = "https://reciclamigo.vercel.app";

// ───────────────────────── Marca (manual de marca) ─────────────────────────
const C = {
  dark: "0B4633",
  lime: "CDF07B",
  light: "CDECB2",
  mid: "6E9862",
  paper: "F4F5EF",
  ink: "0F1F17",
  soft: "3B4F44",
  white: "FFFFFF",
  line: "DDE2D5",
  pet: "2F6FDE",
  hdpe: "E8833A",
  ldpe: "8E63CE",
  pp: "D6457A",
  ps: "C9A227",
  amber: "F2B036",
};
const THEME = {
  name: "Reciclamigo",
  headFontFace: "Arial",
  bodyFontFace: "Calibri",
  colors: {
    dk1: C.ink, lt1: C.white, dk2: C.dark, lt2: C.paper,
    accent1: C.dark, accent2: C.lime, accent3: C.light, accent4: C.mid,
    accent5: C.pet, accent6: C.hdpe, hlink: C.dark, folHlink: C.mid,
  },
};
const DISPLAY = "Impact"; // equivale al titular condensado de la portada del manual

const W = 13.333, H = 7.5, MX = 0.6, CW = W - 2 * MX;
const TOP = 1.95;

// ───────────────────────── Íconos (react-icons/lu → PNG) ─────────────────────────
const ICONOS = {
  pin: "LuMapPin", user: "LuUserCheck", paquete: "LuPackagePlus", campana: "LuBell",
  chat: "LuMessageCircle", escala: "LuScale", escudo: "LuShieldCheck", recibo: "LuReceipt",
  qr: "LuQrCode", apreton: "LuHandshake", edificio: "LuBuilding2", usuarios: "LuUsers",
  codigo: "LuCodeXml", maletin: "LuBriefcase", calculadora: "LuCalculator", megafono: "LuMegaphone",
  laptop: "LuLaptop", meta: "LuTarget", tendencia: "LuTrendingUp", billete: "LuBanknote",
  calendario: "LuCalendarCheck", premio: "LuAward", lista: "LuClipboardCheck", etiqueta: "LuTag",
  documento: "LuFileText", camion: "LuTruck", fabrica: "LuFactory", tienda: "LuStore",
  alcaldia: "LuLandmark", check: "LuCheck", cerrar: "LuX", menos: "LuMinus", radar: "LuRadar",
  grafica: "LuChartColumn", acceso: "LuSmartphone", estrella: "LuStar", ruta: "LuRoute",
};
const ICON_COLORS = { dark: "#0b4633", lime: "#cdf07b", white: "#ffffff", ink: "#0f1f17" };
const ico = (k, c = "dark") => path.join(ASSETS, "iconos", `${k}-${c}.png`);

async function prepararIconos() {
  const dir = path.join(ASSETS, "iconos");
  fs.mkdirSync(dir, { recursive: true });
  for (const [k, nombre] of Object.entries(ICONOS)) {
    const Cmp = Lu[nombre];
    if (!Cmp) { console.warn("  ! ícono inexistente:", nombre); continue; }
    for (const [ck, hex] of Object.entries(ICON_COLORS)) {
      const svg = renderToStaticMarkup(React.createElement(Cmp, { size: 256, strokeWidth: 2 })).replace(/currentColor/g, hex);
      await sharp(Buffer.from(svg)).resize(256, 256).png().toFile(path.join(dir, `${k}-${ck}.png`));
    }
  }
}

// ───────────────────────── Imágenes ─────────────────────────
const marca = (c) => path.join(ASSETS, "marca", `marca-${c}.png`);
const nombre = (c) => path.join(ASSETS, "marca", `nombre-${c}.png`);
const arte = (c) => path.join(ASSETS, "marca", `basurero-${c}.png`);
const ilus = (n) => path.join(ASSETS, "ilustraciones", "png", `${n}.png`);
const marco = (n) => path.join(ASSETS, "marcos", `${n}.png`);
const DIMS = new Map();
const FALTANTES = [];

async function dims(p) {
  if (DIMS.has(p)) return DIMS.get(p);
  if (!fs.existsSync(p)) { DIMS.set(p, null); return null; }
  const m = await sharp(p).metadata();
  const d = { w: m.width, h: m.height };
  DIMS.set(p, d);
  return d;
}
async function precargar(rutas) { for (const r of rutas) await dims(r); }

/** Coloca una imagen dentro de una caja conservando la proporción. align: c | l | r ; valign: m | t | b */
function imgFit(s, p, bx, by, bw, bh, o = {}) {
  const d = DIMS.get(p);
  if (!d) {
    FALTANTES.push(path.basename(p));
    s.addShape(pres.ShapeType.roundRect, { x: bx, y: by, w: bw, h: bh, rectRadius: 0.12, fill: { color: "E7EADF" }, line: { color: C.mid, width: 1, dashType: "dash" } });
    s.addText("falta: " + path.basename(p), { x: bx, y: by, w: bw, h: bh, align: "center", valign: "middle", fontSize: 12, color: C.soft, isTextBox: true });
    return { x: bx, y: by, w: bw, h: bh };
  }
  const r = Math.min(bw / d.w, bh / d.h);
  const w = d.w * r, h = d.h * r;
  const x = o.align === "l" ? bx : o.align === "r" ? bx + bw - w : bx + (bw - w) / 2;
  const y = o.valign === "t" ? by : o.valign === "b" ? by + bh - h : by + (bh - h) / 2;
  const opts = { path: p, x, y, w, h };
  if (o.shadow) opts.shadow = sombra(o.shadow === true ? {} : o.shadow);
  if (o.alt) opts.altText = o.alt;
  s.addImage(opts);
  return { x, y, w, h };
}

// ───────────────────────── Primitivas de diseño ─────────────────────────
const pres = new pptxgen();
const sombra = (o = {}) => ({ type: "outer", color: o.color ?? "0B4633", opacity: o.opacity ?? 0.16, blur: o.blur ?? 12, offset: o.offset ?? 3, angle: 90 });

function caja(s, x, y, w, h, o = {}) {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: o.r ?? 0.2,
    fill: { color: o.fill ?? C.white },
    line: o.line ? { color: o.line, width: o.lw ?? 1 } : { type: "none" },
    ...(o.shadow ? { shadow: sombra() } : {}),
    ...(o.name ? { objectName: o.name } : {}),
  });
}
function tx(s, text, o = {}) {
  // fit "shrink": si otro visor (Google Slides, LibreOffice, un celular) usa una fuente más ancha, el texto se reduce solo en vez de desbordarse.
  s.addText(text, { isTextBox: true, margin: 0, fontFace: "Calibri", fontSize: 16, color: C.ink, valign: "top", paraSpaceAfter: 0, fit: "shrink", ...o });
}
function pill(s, text, x, y, o = {}) {
  const w = o.w ?? 0.5 + text.length * 0.135;
  s.addText(text, {
    shape: pres.ShapeType.roundRect, rectRadius: 0.16, x, y, w, h: 0.32,
    fill: { color: o.fill ?? C.lime }, line: { type: "none" }, isTextBox: true, margin: 0,
    fontFace: "Arial", fontSize: o.size ?? 11, bold: true, color: o.color ?? C.dark, align: "center", valign: "middle", charSpacing: 2,
  });
  return w;
}
/** Círculo con ícono. */
function medallon(s, k, x, y, d, o = {}) {
  s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: o.fill ?? C.dark }, line: { type: "none" } });
  const p = d * 0.52;
  s.addImage({ path: ico(k, o.color ?? "lime"), x: x + (d - p) / 2, y: y + (d - p) / 2, w: p, h: p, altText: o.alt ?? "" });
}
function numero(s, n, x, y, d = 0.46, o = {}) {
  s.addText(String(n), {
    shape: pres.ShapeType.ellipse, x, y, w: d, h: d, fill: { color: o.fill ?? C.lime }, line: { type: "none" },
    isTextBox: true, margin: 0, fontFace: "Arial", fontSize: o.size ?? 16, bold: true, color: o.color ?? C.dark, align: "center", valign: "middle",
  });
}

// Plantillas (en PowerPoint aparecen como diseños)
const FOOT_Y = 6.98;
function pie(color, marcaColor) {
  return [
    { image: { x: MX, y: 7.0, w: 0.286, h: 0.3, path: marca(marcaColor) } },
    { text: { text: "RECICLAMIGO  ·  DINAMICA FEST 2026", options: { x: MX + 0.42, y: FOOT_Y, w: 6, h: 0.33, fontFace: "Arial", fontSize: 10, bold: true, color, charSpacing: 3, margin: 0, valign: "middle" } } },
  ];
}
function definirPlantillas() {
  pres.defineSlideMaster({ title: "PORTADA", background: { color: C.dark }, objects: [] });
  pres.defineSlideMaster({
    title: "CONTENIDO",
    background: { color: C.paper },
    objects: [
      ...pie(C.dark, "verde"),
      { placeholder: { options: { name: "titulo", type: "title", x: MX, y: 0.78, w: CW, h: 1.05, fontFace: "Arial", fontSize: 30, bold: true, color: C.dark, valign: "top", align: "left", margin: 0 }, text: "" } },
    ],
    slideNumber: { x: W - MX - 0.6, y: FOOT_Y, w: 0.6, h: 0.33, fontFace: "Arial", fontSize: 10, bold: true, color: C.dark, align: "right" },
  });
  pres.defineSlideMaster({
    title: "OSCURO",
    background: { color: C.dark },
    objects: [
      ...pie(C.light, "claro"),
      { placeholder: { options: { name: "titulo", type: "title", x: MX, y: 0.78, w: CW, h: 1.05, fontFace: "Arial", fontSize: 30, bold: true, color: C.white, valign: "top", align: "left", margin: 0 }, text: "" } },
    ],
    slideNumber: { x: W - MX - 0.6, y: FOOT_Y, w: 0.6, h: 0.33, fontFace: "Arial", fontSize: 10, bold: true, color: C.light, align: "right" },
  });
}

const SECCIONES = new Set();
function nuevaLamina(masterName, sectionTitle) {
  if (!SECCIONES.has(sectionTitle)) { pres.addSection({ title: sectionTitle }); SECCIONES.add(sectionTitle); }
  return pres.addSlide({ masterName, sectionTitle });
}

function lamina({ plantilla = "CONTENIDO", etiqueta, titulo, seccion, notas }) {
  const s = nuevaLamina(plantilla, seccion);
  if (etiqueta) pill(s, etiqueta.toUpperCase(), MX, 0.36, plantilla === "OSCURO" ? {} : {});
  if (titulo) s.addText(titulo, { placeholder: "titulo" });
  if (notas) s.addNotes(notas);
  return s;
}

// ───────────────────────── Láminas ─────────────────────────
function portada() {
  const s = nuevaLamina("PORTADA", "Apertura");
  imgFit(s, arte("medio"), 0.3, 0.25, 4.7, 7.0, { align: "l" });
  s.addImage({ path: marca("claro"), x: 5.55, y: 0.85, w: 0.95, h: 1.0, altText: "Logo de Reciclamigo" });
  pill(s, "DINAMICA FEST 2026", 6.8, 1.18, { w: 2.5, size: 12 });
  tx(s, "RECICLAMIGO", { x: 5.5, y: 1.95, w: 7.4, h: 1.6, fontFace: DISPLAY, fontSize: 92, color: C.white, valign: "middle" });
  tx(s, "El plástico no termina aquí.", { x: 5.55, y: 3.65, w: 7.2, h: 0.7, fontFace: "Arial", fontSize: 34, bold: true, color: C.lime, valign: "middle" });
  tx(s, "Un mercado digital que conecta a quienes generan plástico post-consumo con quienes lo compran y transforman.", { x: 5.55, y: 4.55, w: 6.6, h: 1.0, fontSize: 20, color: C.light });
  s.addShape(pres.ShapeType.line, { x: 5.55, y: 6.15, w: 7.1, h: 0, line: { color: C.mid, width: 1 } });
  tx(s, "Universidad Católica de El Salvador  ·  Plan de negocios y de marketing", { x: 5.55, y: 6.3, w: 7.2, h: 0.4, fontSize: 16, color: C.light, valign: "middle" });
  s.addNotes("Apertura. Reciclamigo es un mercado digital que conecta a quienes generan plástico post-consumo en El Salvador con quienes lo compran y transforman. Concepto de campaña: «El plástico no termina aquí».\n\nRuta corta (5 min): láminas 1, 2, 4, 5, 11, 14, 17 y 18.");
}

function problema() {
  const s = lamina({
    etiqueta: "El problema", seccion: "Problema",
    titulo: "La mayor parte del plástico termina en el relleno sanitario",
    notas: "La industria plástica salvadoreña exportó más de US$488.5 millones en 2025 y el precio de las resinas vírgenes llegó a subir hasta 85 % (de US$1,000 a US$1,850 por tonelada). Aun así, la mayor parte del plástico de restaurantes, hoteles, comercios y hogares termina en rellenos sanitarios, o se exporta sin procesar a Guatemala y Honduras.",
  });
  const cw = 3.85;
  caja(s, MX, TOP, cw, 2.4, { fill: C.dark, shadow: true });
  tx(s, "US$488.5 M", { x: MX + 0.3, y: TOP + 0.2, w: cw - 0.5, h: 0.95, fontFace: DISPLAY, fontSize: 44, color: C.lime, valign: "middle" });
  tx(s, "exportó la industria plástica salvadoreña en 2025", { x: MX + 0.3, y: TOP + 1.25, w: cw - 0.6, h: 0.95, fontSize: 18, color: C.white });
  const x2 = MX + cw + 0.2;
  caja(s, x2, TOP, cw, 2.4, { fill: C.dark, shadow: true });
  tx(s, "+85 %", { x: x2 + 0.3, y: TOP + 0.2, w: cw - 0.5, h: 0.95, fontFace: DISPLAY, fontSize: 56, color: C.lime, valign: "middle" });
  tx(s, "subió la resina virgen: de US$1,000 a US$1,850 por tonelada", { x: x2 + 0.3, y: TOP + 1.25, w: cw - 0.6, h: 0.95, fontSize: 18, color: C.white });

  caja(s, MX, TOP + 2.6, 2 * cw + 0.2, 2.25, { fill: C.light });
  medallon(s, "camion", MX + 0.35, TOP + 2.95, 0.8, { fill: C.dark });
  tx(s, "El plástico de restaurantes, hoteles, comercios y hogares", { x: MX + 1.4, y: TOP + 2.8, w: 5.95, h: 0.65, fontFace: "Arial", fontSize: 18, bold: true, color: C.dark });
  tx(s, "termina en rellenos sanitarios, o se exporta sin procesar a Guatemala y Honduras. Mientras tanto, la industria paga resina virgen cada vez más cara.", { x: MX + 1.4, y: TOP + 3.55, w: 5.95, h: 1.15, fontSize: 17, color: C.ink });

  const ax = MX + 2 * cw + 0.5;
  caja(s, ax, TOP, W - MX - ax, 4.85, { fill: C.dark, shadow: true });
  imgFit(s, arte("claro"), ax + 0.2, TOP + 0.2, W - MX - ax - 0.4, 4.45, { alt: "Contenedor de basura desbordado de plástico" });
}

function fragmentado() {
  const s = lamina({
    etiqueta: "El problema", seccion: "Problema",
    titulo: "Hay plástico, hay compradores y nadie los conecta",
    notas: "El mercado está fragmentado: pequeños generadores no saben quién compra, los recicladores recorren largas distancias sin certeza de volumen y las empresas necesitan evidencia organizada de la gestión de sus residuos. El Decreto 186 (diciembre 2024) creó la ANDRES y abrió un nuevo marco para los grandes generadores comerciales e industriales.",
  });
  const gap = 0.3, w = (CW - 2 * gap) / 3, h = 3.75;
  const col = [
    { n: "comercio-restaurante", t: "Los generadores", d: "Pequeños negocios que no saben quién compra su plástico." },
    { n: "carreton-reciclador", t: "Los recicladores", d: "Recorren largas distancias sin certeza de cuánto material van a encontrar." },
    { n: "fabrica-resina", t: "Las empresas", d: "Necesitan evidencia organizada de la gestión de sus residuos." },
  ];
  col.forEach((c, i) => {
    const x = MX + i * (w + gap);
    caja(s, x, TOP, w, h, { fill: C.white, shadow: true });
    imgFit(s, ilus(c.n), x + 0.25, TOP + 0.15, w - 0.5, 1.95);
    tx(s, c.t, { x: x + 0.3, y: TOP + 2.2, w: w - 0.6, h: 0.4, fontFace: "Arial", fontSize: 20, bold: true, color: C.dark });
    tx(s, c.d, { x: x + 0.3, y: TOP + 2.65, w: w - 0.6, h: 1.0, fontSize: 17, color: C.ink });
  });
  const by = TOP + h + 0.2;
  caja(s, MX, by, CW, 0.95, { fill: C.dark });
  medallon(s, "documento", MX + 0.3, by + 0.17, 0.6, { fill: C.lime, color: "dark" });
  tx(s, [
    { text: "Nuevo marco legal.  ", options: { bold: true, color: C.lime } },
    { text: "El Decreto 186 (diciembre 2024) creó la Autoridad Nacional de Residuos Sólidos (ANDRES) y abrió un marco nuevo para los grandes generadores comerciales e industriales.", options: { color: C.white } },
  ], { x: MX + 1.1, y: by + 0.1, w: CW - 1.4, h: 0.75, fontSize: 16, valign: "middle" });
}

function solucion() {
  const s = lamina({
    etiqueta: "La solución", seccion: "Solución",
    titulo: "Convertimos el costo de desechar plástico en un ingreso con comprobante",
    notas: "El generador publica un lote, el valorizador más cercano recibe el aviso, lo reserva y coordina el retiro por WhatsApp, y la entrega se confirma en la app con el peso. La plataforma no compra ni transporta el material. Es una app web progresiva: se abre desde un enlace o un código QR, sin tienda de apps.",
  });
  const pasos = [
    { img: "paso-1-registro", t: "Registro y verificación", d: "Perfil con geolocalización. El reciclador entra desde un enlace o QR, sin tienda de apps." },
    { img: "paso-2-publicar", t: "Publicación del lote", d: "Resina, peso estimado, fotos, horario y modalidad: venta, trueque o donación." },
    { img: "paso-3-alerta", t: "Alertas por cercanía", d: "Filtro por radio de 1, 3 o 5 km y por tipo de plástico; aviso al valorizador más cercano." },
    { img: "paso-4-retiro", t: "Reserva y retiro", d: "La app abre WhatsApp para coordinar. Pago por transferencia, billetera digital o efectivo." },
    { img: "paso-5-confirmar", t: "Confirmación", d: "Se confirma el peso, se calcula el CO₂e evitado y ambas partes se califican." },
  ];
  const gap = 0.2, w = (CW - 4 * gap) / 5, h = 4.05;
  pasos.forEach((p, i) => {
    const x = MX + i * (w + gap);
    caja(s, x, TOP, w, h, { fill: C.white, shadow: true });
    imgFit(s, ilus(p.img), x + 0.3, TOP + 0.3, w - 0.6, 1.2);
    numero(s, i + 1, x + 0.18, TOP + 0.16, 0.44);
    tx(s, p.t, { x: x + 0.2, y: TOP + 1.62, w: w - 0.4, h: 0.55, fontFace: "Arial", fontSize: 16, bold: true, color: C.dark });
    tx(s, p.d, { x: x + 0.2, y: TOP + 2.2, w: w - 0.4, h: 1.75, fontSize: 14, color: C.ink });
  });
  const by = TOP + h + 0.2;
  caja(s, MX, by, CW, 0.6, { fill: C.light });
  tx(s, [
    { text: "La plataforma no compra ni transporta el material: ", options: { bold: true, color: C.dark } },
    { text: "facilita el lote, el emparejamiento por cercanía, el cierre bilateral, el comprobante digital y los reportes.", options: { color: C.ink } },
  ], { x: MX + 0.3, y: by, w: CW - 0.6, h: 0.6, fontSize: 15, valign: "middle" });
}

/** Aviso al pie de las láminas con capturas: son del demo, con datos de ejemplo. */
function notaCapturas(s) {
  tx(s, "Capturas del demo con datos de ejemplo", { x: 6.6, y: FOOT_Y, w: W - MX - 0.7 - 6.6, h: 0.33, fontFace: "Arial", fontSize: 10, italic: true, color: C.soft, align: "right", valign: "middle" });
}

function filaIcono(s, k, titulo, texto, x, y, w, o = {}) {
  medallon(s, k, x, y, 0.62);
  tx(s, titulo, { x: x + 0.82, y: y - 0.02, w: w - 0.82, h: 0.36, fontFace: "Arial", fontSize: 18, bold: true, color: o.color ?? C.dark });
  tx(s, texto, { x: x + 0.82, y: y + 0.36, w: w - 0.82, h: o.h ?? 0.95, fontSize: 16, color: o.text ?? C.ink });
}

function publicarYEncontrar() {
  const s = lamina({
    etiqueta: "El sistema", seccion: "Solución",
    titulo: "Publicar un lote, encontrarlo y reservarlo",
    notas: "Demo en pantalla. El comercio publica el lote con resina, peso, fotos, horario y modalidad (venta, trueque o donación). El reciclador ve un mapa con radios de 1, 3 y 5 km y puede filtrar por tipo de plástico. Al reservar, la app abre un chat de WhatsApp con el vendedor para coordinar el retiro. Los precios de referencia son visibles: PET ≈ US$0.20/kg y HDPE ≈ US$0.18/kg.",
  });
  const caja3 = { w: 2.05, h: 4.8 };
  ["phone-m-publicar", "phone-m-mapa", "phone-m-lote"].forEach((n, i) => {
    imgFit(s, marco(n), 0.55 + i * 2.17, TOP + 0.05, caja3.w, caja3.h, { shadow: { blur: 16, opacity: 0.25 }, valign: "t" });
  });
  const x = 7.25, w = W - MX - x;
  filaIcono(s, "paquete", "El comercio publica", "Resina (PET, HDPE, LDPE, PP o PS), peso estimado, fotos, horario de retiro y modalidad.", x, TOP + 0.05, w);
  filaIcono(s, "radar", "El reciclador encuentra", "Mapa con radios de 1, 3 y 5 km y filtro por tipo de plástico; avisa al más cercano.", x, TOP + 1.3, w);
  filaIcono(s, "chat", "Reserva y coordina", "Al reservar, la app abre WhatsApp para acordar el retiro.", x, TOP + 2.55, w);
  caja(s, x, TOP + 3.65, w, 1.2, { fill: C.dark });
  tx(s, "Precio de referencia visible", { x: x + 0.3, y: TOP + 3.75, w: w - 0.6, h: 0.32, fontFace: "Arial", fontSize: 15, bold: true, color: C.lime });
  tx(s, "PET ≈ US$0.20/kg", { x: x + 0.3, y: TOP + 4.1, w: 2.3, h: 0.45, fontFace: DISPLAY, fontSize: 21, color: C.white, valign: "middle" });
  tx(s, "HDPE ≈ US$0.18/kg", { x: x + 2.7, y: TOP + 4.1, w: w - 2.85, h: 0.45, fontFace: DISPLAY, fontSize: 21, color: C.white, valign: "middle" });
  tx(s, "Reduce el margen que hoy captura el intermediario", { x: x + 0.3, y: TOP + 4.52, w: w - 0.6, h: 0.3, fontSize: 14, color: C.light });
  notaCapturas(s);
}

function confirmarYComprobar() {
  const s = lamina({
    etiqueta: "El sistema", seccion: "Solución",
    titulo: "Solo cuenta lo que las dos partes confirman",
    notas: "El comercio registra el peso real de la entrega; el reciclador la acepta o la corrige. Solo una entrega confirmada genera comprobante, ReciclaPuntos y reputación. El comprobante lleva un QR para verificarlo y documenta la entrega registrada en Reciclamigo: no es un permiso ni lo emite una autoridad.",
  });
  const x = MX, w = 5.85;
  filaIcono(s, "escala", "Cierre bilateral", "El comercio registra el peso real; el reciclador acepta o corrige. Hasta entonces no cuenta.", x, TOP + 0.05, w);
  filaIcono(s, "recibo", "Comprobante con QR", "Cada entrega confirmada genera un comprobante que cualquiera puede verificar.", x, TOP + 1.65, w);
  filaIcono(s, "estrella", "Puntos y reputación", "ReciclaPuntos y calificación mutua, solo con entregas confirmadas.", x, TOP + 3.1, w);
  caja(s, x, TOP + 4.3, 5.6, 0.6, { fill: C.light });
  tx(s, "Documenta la entrega: no es un permiso ni lo emite una autoridad.", { x: x + 0.25, y: TOP + 4.3, w: 5.2, h: 0.6, fontSize: 14, bold: true, color: C.dark, valign: "middle" });
  imgFit(s, marco("phone-m-retiros"), 6.55, TOP + 0.05, 2.3, 4.8, { shadow: { blur: 16, opacity: 0.25 }, valign: "t" });
  imgFit(s, marco("comprobante-tarjeta"), 9.1, TOP + 0.05, W - MX - 9.1, 4.8, { shadow: { blur: 16, opacity: 0.22 }, valign: "t" });
  notaCapturas(s);
}

function trazabilidad() {
  const s = lamina({
    etiqueta: "El sistema", seccion: "Solución",
    titulo: "Trazabilidad lista para auditorías e informes de sostenibilidad",
    notas: "Con el Plan Trazabilidad, el comercio recibe un reporte mensual (kilos por material, CO₂e y comprobantes), la insignia «Comercio Circular» con QR y página pública, y puede respaldar su gestión de residuos ante auditorías y el Decreto 186. El reporte no es un permiso ni un certificado estatal. La alcaldía, como segmento, consultará tableros con datos abiertos (en desarrollo).",
  });
  const gap = 0.3, w = (CW - 2 * gap) / 3, h = 4.85;
  const cols = [
    { img: "reporte-pdf", t: "Reporte mensual", d: "Libras por material, CO₂e evitado y la lista de comprobantes, en PDF. Insumo para informes ESG." },
    { img: "desktop-d-impacto", t: "Tu impacto, en números", d: "Libras desviadas, CO₂ evitado e ingresos, solo con entregas confirmadas." },
    { img: "insignia-tarjeta", t: "Comercio Circular", d: "La insignia con QR y página pública: lo reciclado y el CO₂e evitado, sin datos personales." },
  ];
  cols.forEach((c, i) => {
    const x = MX + i * (w + gap);
    caja(s, x, TOP, w, h, { fill: C.white, shadow: true });
    caja(s, x + 0.2, TOP + 0.2, w - 0.4, 2.85, { fill: C.paper, r: 0.14 });
    imgFit(s, marco(c.img), x + 0.3, TOP + 0.3, w - 0.6, 2.65, { shadow: { blur: 10, opacity: 0.2 } });
    tx(s, c.t, { x: x + 0.3, y: TOP + 3.25, w: w - 0.6, h: 0.4, fontFace: "Arial", fontSize: 19, bold: true, color: C.dark });
    tx(s, c.d, { x: x + 0.3, y: TOP + 3.7, w: w - 0.6, h: 1.05, fontSize: 16, color: C.ink });
  });
  notaCapturas(s);
}

function propuestaDeValor() {
  const s = lamina({
    etiqueta: "Propuesta de valor", seccion: "Solución",
    titulo: "Seis diferenciales que hoy no existen juntos",
    notas: "Precios transparentes, trazabilidad, reporte ESG, inclusión sin barreras, micro-geolocalización y reputación e insignias.",
  });
  const gap = 0.25, w = (CW - 2 * gap) / 3, h = 2.35;
  const items = [
    ["etiqueta", "Precios transparentes", "Referencia de mercado visible (PET ≈ US$0.20/kg; HDPE ≈ US$0.18/kg). Reduce el margen del intermediario."],
    ["escudo", "Trazabilidad", "Comprobante de cada entrega y reporte mensual. Respalda la gestión de residuos ante auditorías y el Decreto 186."],
    ["grafica", "Reporte ESG", "Kilos recuperados y CO₂e evitado por empresa, con el Plan Trazabilidad. Insumo para informes de sostenibilidad."],
    ["acceso", "Inclusión sin barreras", "El reciclador entra desde un enlace, sin tienda de apps, y coordina por WhatsApp."],
    ["pin", "Micro-geolocalización", "Ofertas agrupadas en radios de 1 a 5 km: menos combustible y menos tiempo por retiro."],
    ["premio", "Reputación e insignias", "Calificación mutua y reconocimiento a comercios y recicladores: confianza para transar con desconocidos."],
  ];
  items.forEach(([k, t, d], i) => {
    const x = MX + (i % 3) * (w + gap), y = TOP + Math.floor(i / 3) * (h + 0.2);
    caja(s, x, y, w, h, { fill: C.white, shadow: true });
    medallon(s, k, x + 0.28, y + 0.28, 0.66);
    tx(s, t, { x: x + 1.1, y: y + 0.3, w: w - 1.3, h: 0.62, fontFace: "Arial", fontSize: 18, bold: true, color: C.dark, valign: "middle" });
    tx(s, d, { x: x + 0.3, y: y + 1.12, w: w - 0.55, h: 1.15, fontSize: 15, color: C.ink });
  });
}

function mercado() {
  const s = lamina({
    etiqueta: "Mercado", seccion: "Negocio",
    titulo: "Cuatro actores y un piloto de 120 organizaciones",
    notas: "El piloto apunta a 120 organizaciones en Santa Ana y el AMSS. El techo identificado en el anteproyecto es de más de 2,500 restaurantes, 800 hoteles y 150 centros de acopio a escala nacional.",
  });
  const lw = 3.95;
  caja(s, MX, TOP, lw, 2.2, { fill: C.dark, shadow: true });
  tx(s, "120", { x: MX + 0.3, y: TOP + 0.05, w: 1.85, h: 1.25, fontFace: DISPLAY, fontSize: 72, color: C.lime, valign: "middle" });
  tx(s, "organizaciones en el piloto", { x: MX + 2.1, y: TOP + 0.3, w: lw - 2.25, h: 0.8, fontSize: 18, bold: true, color: C.white, valign: "middle" });
  tx(s, "Santa Ana y el Área Metropolitana de San Salvador (AMSS)", { x: MX + 0.3, y: TOP + 1.3, w: lw - 0.6, h: 0.75, fontSize: 16, color: C.light });
  caja(s, MX, TOP + 2.4, lw, 2.45, { fill: C.light });
  tx(s, "Techo a escala nacional", { x: MX + 0.3, y: TOP + 2.55, w: lw - 0.6, h: 0.35, fontFace: "Arial", fontSize: 15, bold: true, color: C.dark });
  [["2,500+", "restaurantes"], ["800", "hoteles"], ["150", "centros de acopio"]].forEach(([n, l], i) => {
    const y = TOP + 3.0 + i * 0.58;
    tx(s, n, { x: MX + 0.3, y, w: 1.8, h: 0.52, fontFace: DISPLAY, fontSize: 30, color: C.dark, valign: "middle" });
    tx(s, l, { x: MX + 1.85, y, w: lw - 2.0, h: 0.52, fontSize: 17, color: C.ink, valign: "middle" });
  });
  const x0 = MX + lw + 0.25, gw = (W - MX - x0 - 0.2) / 2, gh = 2.32;
  const seg = [
    ["tienda", "Generadores urbanos", "Restaurantes, hoteles, centros comerciales, oficinas, colegios e industrias.", "Publican lotes gratis; pagan el Plan Trazabilidad si necesitan reportes."],
    ["camion", "Valorizadores productivos", "Recicladores de base, centros de acopio, transformadores y fabricantes de madera plástica.", "Compran lotes; el reciclador de base no paga comisión."],
    ["fabrica", "Industria transformadora", "Fabricantes de empaques y empresas de la industria plástica.", "Compradores de volumen: comisión de 2 % a 4 %."],
    ["alcaldia", "Municipalidades", "Alcaldías de Santa Ana, San Salvador y municipios conexos.", "Tableros de control con datos abiertos."],
  ];
  seg.forEach(([k, t, p, r], i) => {
    const x = x0 + (i % 2) * (gw + 0.2), y = TOP + Math.floor(i / 2) * (gh + 0.21);
    caja(s, x, y, gw, gh, { fill: C.white, shadow: true });
    medallon(s, k, x + 0.25, y + 0.22, 0.58);
    tx(s, t, { x: x + 1.0, y: y + 0.22, w: gw - 1.15, h: 0.58, fontFace: "Arial", fontSize: 16, bold: true, color: C.dark, valign: "middle" });
    tx(s, p, { x: x + 0.28, y: y + 0.92, w: gw - 0.5, h: 0.72, fontSize: 14, color: C.soft });
    tx(s, r, { x: x + 0.28, y: y + 1.72, w: gw - 0.5, h: 0.52, fontSize: 14, bold: true, color: C.dark });
  });
}

function competencia() {
  const s = lamina({
    etiqueta: "Competencia", seccion: "Negocio",
    titulo: "Ninguna iniciativa revisada es un mercado con precio y trazabilidad",
    notas: "Las iniciativas existentes informan, orientan o reciben reportes; ninguna de las revisadas funciona como mercado de compraventa con precio de referencia y trazabilidad. ReciApp (Ecuador) es un referente de modelo: valida que los servicios a empresas generan ingresos. La ventaja defendible está en la combinación; el historial de transacciones y la red de recicladores y compradores en Santa Ana y el AMSS tardan más en replicarse.",
  });
  const hd = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.dark }, fontFace: "Arial", fontSize: 14, valign: "middle" } });
  const cel = (t, o = {}) => ({ text: t, options: { color: C.ink, fontFace: "Calibri", fontSize: 14, valign: "middle", ...o } });
  const rows = [
    [hd("Iniciativa"), hd("Qué es"), hd("Brecha que cubre Reciclamigo")],
    [cel("Ecoin\nEl Salvador", { bold: true }), cel("Programa de separación y entrega de reciclables, con directorio digital de centros de recuperación."), cel("Orienta a dónde entregar, pero no vende con precio ni da comprobante.")],
    [cel("YoReciclosv\nEl Salvador", { bold: true }), cel("Plataforma web de estudiantes de UTEC sobre centros de acopio, materiales y recicladores de base."), cel("Solo web e informativa, sin transacción.")],
    [cel("NorteGo\nSanta Ana Norte", { bold: true }), cel("Aplicación municipal para reportar desechos, baches y alumbrado."), cel("No es una herramienta de reciclaje ni de compraventa.")],
    [cel("ReciApp\nEcuador", { bold: true }), cel("Conecta ciudadanos con recicladores de base y registra entregas; ofrece servicios a empresas."), cel("Referente de modelo: valida que los servicios a empresas generan ingresos.")],
    [cel("Reciclamigo", { bold: true, color: C.dark, fill: { color: C.lime }, fontSize: 16, fontFace: "Arial" }), cel("Mercado de compraventa con precio de referencia, comprobante y reporte de trazabilidad.", { bold: true, color: C.dark, fill: { color: C.lime } }), cel("Precio visible, comprobante de cada entrega, acceso sin tienda de apps y reporte, en un solo flujo.", { bold: true, color: C.dark, fill: { color: C.lime } })],
  ];
  s.addTable(rows, { x: MX, y: TOP, w: CW, colW: [2.1, 5.0, 5.033], rowH: [0.42, 0.74, 0.74, 0.62, 0.74, 0.78], border: { type: "solid", pt: 1, color: C.line }, fill: { color: C.white }, margin: [0.04, 0.14, 0.04, 0.14] });
  tx(s, [
    { text: "Cada elemento por separado puede copiarse. ", options: { bold: true, color: C.dark } },
    { text: "El historial de transacciones y la red de recicladores y compradores que se acumulan en Santa Ana y el AMSS tardan más en replicarse.", options: { color: C.ink } },
  ], { x: MX, y: TOP + 4.25, w: CW, h: 0.65, fontSize: 15, valign: "middle" });
}

function modelo() {
  const s = lamina({
    etiqueta: "Modelo de negocio", seccion: "Negocio",
    titulo: "Vender es gratis: el ingreso viene del Plan Trazabilidad",
    notas: "Vender plástico en Reciclamigo es gratis. La empresa gana de dos formas: el Plan Trazabilidad de US$14.99 al mes, para quienes necesitan documentar lo que reciclan, y una comisión de 2 % a 4 % (3 % en el modelo) que pagan solo los centros de acopio y la industria que compran volumen. El reciclador de base no paga comisión. En el escenario base, el 88 % del ingreso del año 2 viene de suscripciones. Ambos planes incluyen el respaldo si el reciclador no llega (el lote se vuelve a publicar solo) y repetir un lote con un toque.\n\nSi preguntan quiénes son los compradores de volumen: no hay un umbral en libras; «volumen» es un tipo de comprador (centros de acopio, recicladoras y transformadoras de PET, HDPE y PP). El administrador asigna el tipo de cada valorizador. Pagan 3 % (rango de 2 % a 4 %) solo sobre compras confirmadas; una donación o un trueque no genera comisión. Los comercios y los recicladores de base no pagan.",
  });
  const tw = 7.55;
  const hd = (t, o = {}) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.dark }, fontFace: "Arial", fontSize: 14, valign: "middle", align: o.align ?? "left", ...o } });
  const f = (t) => ({ text: t, options: { color: C.ink, fontFace: "Calibri", fontSize: 14, valign: "middle" } });
  const v = (t, plan) => ({ text: t, options: { color: plan ? C.dark : C.soft, bold: !!plan, fontFace: "Calibri", fontSize: 14, valign: "middle", align: "center", fill: plan ? { color: "F1F9DE" } : undefined } });
  const si = "Sí", no = "—";
  const rows = [
    [hd("Función"), hd("Gratis\nUS$0", { align: "center" }), hd("Plan Trazabilidad\nUS$14.99/mes", { align: "center", color: C.dark, fill: { color: C.lime } })],
    [f("Lotes publicados al mes"), v("Hasta 8"), v("Ilimitados", true)],
    [f("Mapa, reserva y enlace a WhatsApp"), v(si), v(si, true)],
    [f("Comprobante de cada venta"), v(si), v(si, true)],
    [f("ReciclaPuntos por entregas confirmadas"), v(si), v(si, true)],
    [f("Insignia «Comercio Circular»"), v("Básica"), v("Con QR y página pública", true)],
    [f("Historial"), v("Últimos 30 días"), v("Completo y exportable", true)],
    [f("Reporte mensual de trazabilidad"), v(no), v(si, true)],
    [f("Retiros programados con el mismo valorizador"), v(no), v(si, true)],
    [f("Prioridad en alertas"), v(no), v(si, true)],
  ];
  s.addTable(rows, { x: MX, y: TOP, w: tw, colW: [3.45, 1.5, 2.6], rowH: [0.62, ...Array(9).fill(0.4)], border: { type: "solid", pt: 1, color: C.line }, fill: { color: C.white }, margin: [0.03, 0.12, 0.03, 0.12] });
  tx(s, "Quién paga el plan: hoteles, cadenas de restaurantes y franquicias, proveedores de grandes empresas, supermercados, centros comerciales, industrias, colegios y oficinas.", { x: MX, y: TOP + 4.38, w: tw, h: 0.55, fontSize: 14, color: C.soft });
  const x = MX + tw + 0.3, w = W - MX - x;
  const tarjetas = [
    ["0 %", "de comisión para comercios y recicladores de base", C.dark, C.lime, C.white],
    ["2–4 %", "de comisión (3 % en el modelo) solo a centros de acopio e industria que compran volumen", C.dark, C.lime, C.white],
    ["88 %", "del ingreso del año 2 viene de suscripciones (escenario base)", C.light, C.dark, C.ink],
  ];
  tarjetas.forEach(([n, d, bg, nc, tc], i) => {
    const y = TOP + i * 1.67;
    caja(s, x, y, w, 1.55, { fill: bg, shadow: true });
    tx(s, n, { x: x + 0.25, y: y + 0.1, w: 1.95, h: 1.35, fontFace: DISPLAY, fontSize: 40, color: nc, valign: "middle" });
    tx(s, d, { x: x + 1.95, y: y + 0.1, w: w - 2.05, h: 1.35, fontSize: 15, color: tc, valign: "middle" });
  });
}

function marketing() {
  const s = lamina({
    etiqueta: "Marketing y lanzamiento", seccion: "Plan",
    titulo: "Construir una comunidad comercial real, no solo descargas",
    notas: "Una app puede acumular miles de descargas y fracasar si las empresas no publican plástico o no hay compradores. Por eso el plan construye comunidad, confianza y demuestra que el residuo plástico es una oportunidad económica. Canales en orden de prioridad: demostraciones empresariales, LinkedIn, alianzas y difusión, redes sociales y capacitaciones.",
  });
  const lw = 4.45;
  caja(s, MX, TOP, lw, 4.2, { fill: C.dark, shadow: true });
  tx(s, "«El plástico no termina aquí»", { x: MX + 0.3, y: TOP + 0.25, w: lw - 0.6, h: 1.25, fontFace: DISPLAY, fontSize: 36, color: C.lime });
  tx(s, "Tus residuos pueden ser la materia prima de alguien más.", { x: MX + 0.3, y: TOP + 1.55, w: lw - 0.6, h: 0.8, fontSize: 18, color: C.white });
  [["Antes", "contenido de expectativa sobre el valor del plástico"], ["Durante", "video oficial, demostración y enlaces de registro"], ["Después", "tutoriales, experiencias de usuarios y oportunidades"]].forEach(([a, b], i) => {
    const y = TOP + 2.45 + i * 0.57;
    tx(s, a, { x: MX + 0.3, y, w: 1.0, h: 0.5, fontFace: "Arial", fontSize: 14, bold: true, color: C.lime, valign: "middle" });
    tx(s, b, { x: MX + 1.3, y, w: lw - 1.6, h: 0.5, fontSize: 14, color: C.light, valign: "middle" });
  });
  const x = MX + lw + 0.3, w = W - MX - x;
  const canales = [
    ["Demostraciones empresariales", "Base de generadores y recolectores; contacto por correo, llamadas y LinkedIn; demostración adaptada al rol."],
    ["LinkedIn", "Página y perfiles del equipo; contenido de economía circular y mensajes personalizados."],
    ["Alianzas y difusión", "FUNDEMAS, CEPA, Unidad Ambiental del CNR, asociaciones empresariales, universidades, municipalidades, Asiplastic y CDMYPE."],
    ["Redes sociales", "Videos cortos y demostraciones en Instagram, Facebook y TikTok, con pauta segmentada en El Salvador."],
    ["Capacitaciones y mini eventos", "Charlas y ferias ambientales; cada una cierra con una demostración de la app."],
  ];
  canales.forEach(([t, d], i) => {
    const y = TOP + i * 0.86;
    numero(s, i + 1, x, y + 0.04, 0.46);
    tx(s, t, { x: x + 0.65, y, w: w - 0.65, h: 0.3, fontFace: "Arial", fontSize: 16, bold: true, color: C.dark });
    tx(s, d, { x: x + 0.65, y: y + 0.3, w: w - 0.65, h: 0.55, fontSize: 14, color: C.soft });
  });
  const by = TOP + 4.4;
  caja(s, MX, by, CW, 0.5, { fill: C.light });
  tx(s, [
    { text: "Cómo medimos:  ", options: { bold: true, color: C.dark } },
    { text: "demostraciones que terminan en registro  ·  registrados vs. meta del piloto  ·  40 transacciones  ·  costo por empresa", options: { color: C.ink } },
  ], { x: MX + 0.25, y: by, w: CW - 0.5, h: 0.5, fontSize: 14, valign: "middle" });
}

function piloto() {
  const s = lamina({
    etiqueta: "Piloto", seccion: "Plan",
    titulo: "Un piloto de 18 semanas para validar el flujo completo",
    notas: "La cohorte operativa del piloto (semanas 1 a 18) valida el flujo completo; la meta del mes 6 corresponde al inicio de la operación comercial y coincide con el escenario base del modelo financiero. El piloto es gratis.",
  });
  const kpis = [
    ["Generadores registrados", "25", "", "Mes 6: 40", "Al menos 40 % activos"],
    ["Valorizadores registrados", "12", "", "Mes 6: 20", "Al menos 40 % activos"],
    ["Transacciones", "40", " verificadas", "Mes 6: 100", "Cierre bilateral y evidencia"],
    ["Volumen", "8", " t", "Mes 6: 20 t acumuladas", "Peso comprobado"],
    ["Clientes de pago", "10", " negocios", "Mes 6: 8 con Plan Trazabilidad", "Piden el reporte (el piloto es gratis)"],
    ["Retención", "≥60", " %", "Mes 6: ≥65 %", "Actividad o pago al siguiente período"],
    ["Satisfacción", "≥4.3", "/5", "Mes 6: ≥4.3/5", "Encuesta posterior al cierre"],
  ];
  const fila = (items, y, h, n) => {
    const gap = 0.2, w = (CW - (n - 1) * gap) / n;
    items.forEach((k, i) => {
      const x = MX + i * (w + gap);
      caja(s, x, y, w, h, { fill: C.white, shadow: true });
      tx(s, k[0], { x: x + 0.25, y: y + 0.14, w: w - 0.4, h: 0.3, fontFace: "Arial", fontSize: 13, bold: true, color: C.dark });
      tx(s, [{ text: k[1], options: { fontFace: DISPLAY, fontSize: 44, color: C.dark } }, { text: k[2], options: { fontFace: "Arial", fontSize: 16, bold: true, color: C.dark } }], { x: x + 0.25, y: y + 0.46, w: w - 0.5, h: 0.8, valign: "middle" });
      tx(s, "Meta formal, semana 18", { x: x + 0.25, y: y + 1.27, w: w - 0.5, h: 0.25, fontSize: 12, color: C.soft });
      s.addShape(pres.ShapeType.line, { x: x + 0.25, y: y + 1.6, w: w - 0.5, h: 0, line: { color: C.line, width: 1 } });
      tx(s, k[3], { x: x + 0.25, y: y + 1.66, w: w - 0.5, h: 0.3, fontSize: 14, bold: true, color: C.dark });
      tx(s, k[4], { x: x + 0.25, y: y + 1.96, w: w - 0.5, h: 0.3, fontSize: 13, color: C.soft });
    });
  };
  fila(kpis.slice(0, 4), TOP, 2.3, 4);
  fila(kpis.slice(4), TOP + 2.5, 2.3, 3);
}

function proyeccion() {
  const s = lamina({
    etiqueta: "Proyección financiera", seccion: "Plan",
    titulo: "El negocio cubre sus costos mensuales desde el mes 13",
    notas: "La proyección solo cuenta como ingreso las suscripciones y las comisiones: el valor del plástico movido va a los negocios y recicladores, igual que en Uber el valor de la carrera es del conductor. Escenario base: ingreso de US$1,602 en el año 1 y US$4,982 en el año 2. En el año 1 se mueven 78 toneladas, que dejan unos US$14,847 a negocios y recicladores y evitan 156 toneladas de CO₂e. La pérdida acumulada llega a su máximo de US$1,574 en el mes 12 y la caja acumulada vuelve a positivo en el mes 24.",
  });
  const meses = ["Mes 1", "Mes 4", "Mes 6", "Mes 9", "Mes 12", "Mes 18", "Mes 24"];
  const cw = (CW - 0.3) / 2, ch = 3.15;
  const eje = { catAxisLabelFontFace: "Calibri", catAxisLabelFontSize: 12, catAxisLabelColor: C.soft, valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" }, dataLabelFontFace: "Calibri", dataLabelFontSize: 12, dataLabelColor: C.ink, dataLabelFormatCode: "#,##0", showTitle: false };
  caja(s, MX, TOP, cw, ch + 0.5, { fill: C.white, shadow: true });
  tx(s, "Negocios activos y con Plan Trazabilidad", { x: MX + 0.25, y: TOP + 0.15, w: cw - 0.5, h: 0.32, fontFace: "Arial", fontSize: 15, bold: true, color: C.dark });
  s.addChart(pres.charts.BAR, [
    { name: "Negocios activos", labels: meses, values: [6, 23, 39, 62, 83, 119, 149] },
    { name: "Con Plan Trazabilidad", labels: meses, values: [0, 0, 8, 12, 17, 24, 30] },
  ], { x: MX + 0.15, y: TOP + 0.5, w: cw - 0.3, h: ch - 0.05, barDir: "col", barGrouping: "clustered", barGapWidthPct: 45, chartColors: [C.dark, C.lime], showValue: true, dataLabelPosition: "outEnd", showLegend: true, legendPos: "b", legendFontFace: "Calibri", legendFontSize: 12, legendColor: C.soft, ...eje });
  const x2 = MX + cw + 0.3;
  caja(s, x2, TOP, cw, ch + 0.5, { fill: C.white, shadow: true });
  tx(s, "Resultado del mes (US$)", { x: x2 + 0.25, y: TOP + 0.15, w: cw - 0.5, h: 0.32, fontFace: "Arial", fontSize: 15, bold: true, color: C.dark });
  s.addChart(pres.charts.BAR, [
    { name: "Resultado del mes", labels: meses, values: [-152, -145, -177, -112, -48, 129, 211] },
  ], { x: x2 + 0.15, y: TOP + 0.5, w: cw - 0.3, h: ch - 0.05, barDir: "col", barGapWidthPct: 45, chartColors: [C.dark], invertedColors: [C.amber], showValue: true, dataLabelPosition: "outEnd", showLegend: false, catAxisLabelPos: "low", ...eje });
  const chips = [
    ["Mes 13", "se cubren los costos mensuales"],
    ["US$1,602", "ingreso del año 1; año 2: US$4,982"],
    ["US$1,574", "pérdida acumulada máxima (mes 12)"],
    ["78 t", "movidas en el año 1; evitan 156 t de CO₂e"],
    ["US$14,847", "para negocios y recicladores en el año 1"],
  ];
  const gap = 0.2, w = (CW - 4 * gap) / 5, y = TOP + ch + 0.7, hc = 0.98;
  chips.forEach(([n, d], i) => {
    const x = MX + i * (w + gap);
    caja(s, x, y, w, hc, { fill: i === 0 ? C.dark : C.light });
    tx(s, n, { x: x + 0.2, y: y + 0.07, w: w - 0.4, h: 0.45, fontFace: DISPLAY, fontSize: 24, color: i === 0 ? C.lime : C.dark, valign: "middle" });
    tx(s, d, { x: x + 0.2, y: y + 0.52, w: w - 0.35, h: 0.42, fontSize: 12, color: i === 0 ? C.white : C.ink });
  });
}

function escenarios() {
  const s = lamina({
    etiqueta: "Escenarios", seccion: "Plan",
    titulo: "Tres escenarios: el piloto mide cuál es el real",
    notas: "Si ocurre el escenario conservador, faltarían unos US$1,463 en 24 meses. Se cubren bajando la pauta a la mitad desde el lanzamiento (ahorro de US$1,500) y buscando patrocinio para los kits de recicladores; los premios del reto suman aparte. El piloto de 18 semanas sirve para medir qué escenario es el real. Todos los supuestos están en el modelo financiero en Excel que acompaña el plan.",
  });
  const gap = 0.25, w = (CW - 2 * gap) / 3, h = 4.1;
  const esc = [
    { n: "Conservador", cubre: ">24", cubreL: "mes en que cubre costos", f: [["Negocios nuevos al mes", "5"], ["Pagan el plan", "12 %"], ["Con plan al mes 12", "6"], ["Ingreso año 1", "US$717"], ["Ingreso año 2", "US$1,892"], ["Pérdida máxima", "US$3,702"]], bg: C.white, hd: C.light, hc: C.dark },
    { n: "Base", cubre: "13", cubreL: "mes en que cubre costos", f: [["Negocios nuevos al mes", "9"], ["Pagan el plan", "20 %"], ["Con plan al mes 12", "17"], ["Ingreso año 1", "US$1,602"], ["Ingreso año 2", "US$4,982"], ["Pérdida máxima", "US$1,574"]], bg: C.dark, hd: C.lime, hc: C.dark, dark: true },
    { n: "Optimista", cubre: "8", cubreL: "mes en que cubre costos", f: [["Negocios nuevos al mes", "13"], ["Pagan el plan", "28 %"], ["Con plan al mes 12", "31"], ["Ingreso año 1", "US$2,840"], ["Ingreso año 2", "US$9,519"], ["Pérdida máxima", "US$891"]], bg: C.white, hd: C.light, hc: C.dark },
  ];
  esc.forEach((e, i) => {
    const x = MX + i * (w + gap);
    caja(s, x, TOP, w, h, { fill: e.bg, shadow: true });
    pill(s, e.n.toUpperCase(), x + 0.25, TOP + 0.22, { fill: e.hd, color: e.hc, w: 1.7 });
    tx(s, e.cubre, { x: x + 0.25, y: TOP + 0.58, w: 1.6, h: 1.0, fontFace: DISPLAY, fontSize: 54, color: e.dark ? C.lime : C.dark, valign: "middle" });
    tx(s, e.cubreL, { x: x + 1.75, y: TOP + 0.65, w: w - 1.95, h: 0.85, fontSize: 14, color: e.dark ? C.light : C.soft, valign: "middle" });
    e.f.forEach(([a, b], j) => {
      const y = TOP + 1.65 + j * 0.4;
      tx(s, a, { x: x + 0.25, y, w: w - 1.9, h: 0.36, fontSize: 14, color: e.dark ? C.light : C.soft, valign: "middle" });
      tx(s, b, { x: x + w - 1.65, y, w: 1.4, h: 0.36, fontSize: 15, bold: true, color: e.dark ? C.white : C.dark, align: "right", valign: "middle" });
    });
  });
  const by = TOP + h + 0.2;
  caja(s, MX, by, CW, 0.62, { fill: C.light });
  tx(s, [
    { text: "Si ocurre el conservador, faltarían unos US$1,463 en 24 meses: ", options: { bold: true, color: C.dark } },
    { text: "se cubren con la pauta a la mitad (ahorro de US$1,500) y patrocinio para los kits.", options: { color: C.ink } },
  ], { x: MX + 0.25, y: by, w: CW - 0.5, h: 0.62, fontSize: 14, valign: "middle" });
}

function equipo() {
  const s = lamina({
    etiqueta: "Equipo", seccion: "Plan",
    titulo: "Cinco estudiantes de la Universidad Católica de El Salvador",
    notas: "Cinco estudiantes con perfiles que cubren cada parte del negocio. Ninguno cobra salario hasta que la empresa cubra sus costos. Aporte del equipo en especie: unas 300 horas de desarrollo (US$3,000 a precio de mercado), la contabilidad que prepara la contadora del equipo (US$750) y medio tiempo sin salario de los cinco socios durante 18 meses (US$18,396): en total US$22,146 que no entran en la caja pero muestran el compromiso. Forma jurídica: SAS.",
  });
  const roles = [
    ["codigo", "Ingeniería de software", "Desarrollo y mantenimiento de la aplicación."],
    ["maletin", "Administración de empresas", "Dirección, finanzas y alianzas; también participa en el desarrollo."],
    ["calculadora", "Contaduría", "Contabilidad, declaraciones y control del presupuesto."],
    ["megafono", "Marketing", "Marca, contenido, pauta digital y relación con la comunidad."],
    ["laptop", "Negocios digitales", "Ventas a empresas, demostraciones y experiencia del usuario."],
  ];
  const gap = 0.2, w = (CW - 4 * gap) / 5, h = 2.75;
  roles.forEach(([k, t, d], i) => {
    const x = MX + i * (w + gap);
    caja(s, x, TOP, w, h, { fill: C.white, shadow: true });
    medallon(s, k, x + 0.25, TOP + 0.25, 0.7);
    tx(s, t, { x: x + 0.25, y: TOP + 1.1, w: w - 0.45, h: 0.6, fontFace: "Arial", fontSize: 16, bold: true, color: C.dark });
    tx(s, d, { x: x + 0.25, y: TOP + 1.72, w: w - 0.45, h: 0.95, fontSize: 14, color: C.ink });
  });
  const y2 = TOP + h + 0.2, h2 = 1.9, wl = 6.1;
  caja(s, MX, y2, wl, h2, { fill: C.dark, shadow: true });
  tx(s, "US$22,146", { x: MX + 0.3, y: y2 + 0.15, w: 2.5, h: 0.75, fontFace: DISPLAY, fontSize: 38, color: C.lime, valign: "middle" });
  tx(s, "en especie: nadie cobra salario hasta cubrir costos", { x: MX + 2.65, y: y2 + 0.15, w: wl - 2.9, h: 0.75, fontSize: 15, bold: true, color: C.white, valign: "middle" });
  tx(s, "≈300 horas de desarrollo (US$3,000), contabilidad (US$750) y medio tiempo de los cinco socios durante 18 meses (US$18,396).", { x: MX + 0.3, y: y2 + 1.0, w: wl - 0.6, h: 0.8, fontSize: 14, color: C.light });
  const xr = MX + wl + 0.25, wr = W - MX - xr;
  caja(s, xr, y2, wr, h2, { fill: C.light });
  tx(s, "Sociedad por Acciones Simplificada (SAS)", { x: xr + 0.3, y: y2 + 0.15, w: wr - 0.6, h: 0.4, fontFace: "Arial", fontSize: 16, bold: true, color: C.dark });
  tx(s, "Se constituye en línea ante el CNR: inscripción gratuita, sin notario y capital mínimo de US$1. Separa el patrimonio de la empresa del de los socios y permite emitir y transferir acciones, sin ser una ONG.", { x: xr + 0.3, y: y2 + 0.62, w: wr - 0.6, h: 1.2, fontSize: 14, color: C.ink });
}

function inversion() {
  const s = lamina({
    etiqueta: "La inversión", seccion: "Cierre",
    titulo: "Pedimos US$5,000 por el 15 % de las acciones",
    notas: "La inversión se limita a lo esencial: dos socios programan la aplicación, la contadora del equipo prepara la contabilidad (con revisión de un contador autorizado el primer año) y todos usan su propio equipo. De los US$5,000: US$2,761 de inversión inicial, US$1,574 de operación hasta cubrir costos y US$665 de reserva (unos 2 meses de costos). El inversionista recibe 15 % de las acciones, lo que implica un valor de la empresa de US$33,333 después de la inversión. Participa en dividendos cuando haya utilidades, o en una futura venta o recompra de acciones, siempre sujeta a la caja disponible y a la aprobación de los socios. No se prometen múltiplos de retorno. Los premios del reto (US$1,000, US$700 o US$400) se usarían como capital semilla y reducirían el monto pedido.",
  });
  const lw = 4.7;
  caja(s, MX, TOP, lw, 3.85, { fill: C.white, shadow: true });
  s.addChart(pres.charts.DOUGHNUT, [{ name: "Uso del monto", labels: ["Inversión inicial", "Operación hasta cubrir costos", "Reserva"], values: [2761, 1574, 665] }], { x: MX + 0.35, y: TOP + 0.1, w: 2.8, h: 2.8, holeSize: 64, chartColors: [C.dark, C.lime, C.mid], showLegend: false, showPercent: false, showValue: false, showLabel: false, dataBorder: { pt: 2, color: C.white } });
  tx(s, "US$5,000", { x: MX + 0.35, y: TOP + 1.05, w: 2.8, h: 0.5, fontFace: DISPLAY, fontSize: 26, color: C.dark, align: "center", valign: "middle" });
  tx(s, "solicitados", { x: MX + 0.35, y: TOP + 1.5, w: 2.8, h: 0.3, fontSize: 13, color: C.soft, align: "center" });
  [["US$2,761", "Inversión inicial", C.dark], ["US$1,574", "Operación hasta cubrir costos", C.lime], ["US$665", "Reserva (≈2 meses de costos)", C.mid]].forEach(([n, l, c], i) => {
    const y = TOP + 2.85 + i * 0.32;
    s.addShape(pres.ShapeType.ellipse, { x: MX + 0.3, y: y + 0.06, w: 0.2, h: 0.2, fill: { color: c }, line: { color: C.dark, width: 0.5 } });
    tx(s, n, { x: MX + 0.6, y, w: 1.1, h: 0.32, fontFace: "Arial", fontSize: 13, bold: true, color: C.dark, valign: "middle" });
    tx(s, l, { x: MX + 1.7, y, w: lw - 1.8, h: 0.32, fontSize: 13, color: C.ink, valign: "middle" });
  });
  const x = MX + lw + 0.3, w = W - MX - x;
  const hd = (t, o = {}) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.dark }, fontFace: "Arial", fontSize: 13, valign: "middle", align: o.align ?? "left" } });
  const a = (t, b) => ({ text: t, options: { color: C.ink, fontFace: "Calibri", fontSize: 13, valign: "middle", bold: !!b } });
  const m = (t, b) => ({ text: t, options: { color: C.dark, fontFace: "Calibri", fontSize: 13, valign: "middle", align: "right", bold: true, fill: b ? { color: C.lime } : undefined } });
  const rubros = [
    ["Constitución como SAS y registros", "US$150"], ["Asesoría legal puntual", "US$250"], ["Desarrollo del producto mínimo", "US$400"],
    ["Básculas digitales colgantes (10)", "US$150"], ["Kits para recicladores (20)", "US$200"], ["Capacitaciones del piloto (6 sesiones)", "US$210"],
    ["Material impreso", "US$150"], ["Marketing de lanzamiento", "US$1,000"], ["Imprevistos (10 %)", "US$251"],
  ];
  const rows = [[hd("Inversión inicial: en qué se usa"), hd("Monto", { align: "right" })], ...rubros.map(([r, v]) => [a(r), m(v)]), [{ text: "Total inversión inicial", options: { bold: true, color: C.dark, fill: { color: C.lime }, fontFace: "Arial", fontSize: 13, valign: "middle" } }, m("US$2,761", true)]];
  s.addTable(rows, { x, y: TOP, w, colW: [w - 1.5, 1.5], rowH: [0.36, ...Array(9).fill(0.31), 0.36], border: { type: "solid", pt: 1, color: C.line }, fill: { color: C.white }, margin: [0.02, 0.12, 0.02, 0.12] });
  const by = TOP + 4.05;
  caja(s, MX, by, CW, 0.88, { fill: C.dark, shadow: true });
  tx(s, [
    { text: "A cambio: 15 % de las acciones", options: { bold: true, color: C.lime } },
    { text: " (empresa valorada en US$33,333 después de la inversión). Dividendos al generar utilidades, o venta o recompra de acciones; sin promesas de múltiplos. ", options: { color: C.white } },
    { text: "Los premios del reto (US$1,000, US$700 o US$400) serían capital semilla y reducirían el monto.", options: { color: C.light } },
  ], { x: MX + 0.3, y: by, w: CW - 0.6, h: 0.88, fontSize: 14, valign: "middle" });
}

async function cierre() {
  const s = nuevaLamina("PORTADA", "Cierre");
  imgFit(s, arte("medio"), W - 4.9, 0.3, 4.7, 6.9, { align: "r" });
  s.addImage({ path: marca("claro"), x: 0.8, y: 0.85, w: 1.15, h: 1.2, altText: "Logo de Reciclamigo" });
  s.addImage({ path: nombre("lima"), x: 2.2, y: 1.2, w: 4.4, h: 0.42, altText: "Reciclamigo" });
  tx(s, "El plástico\nno termina aquí.", { x: 0.8, y: 2.3, w: 7.0, h: 2.3, fontFace: DISPLAY, fontSize: 66, color: C.white, valign: "middle", lineSpacingMultiple: 0.95 });
  tx(s, "Publicar es gratis. El Plan Trazabilidad, US$14.99 al mes, es para quien necesita documentar lo que recicla.", { x: 0.8, y: 4.75, w: 6.9, h: 0.95, fontSize: 19, color: C.light });
  tx(s, "Gracias", { x: 0.8, y: 5.8, w: 4, h: 0.6, fontFace: "Arial", fontSize: 30, bold: true, color: C.lime, valign: "middle" });
  tx(s, "DINAMICA FEST 2026  ·  Universidad Católica de El Salvador", { x: 0.8, y: 6.5, w: 7, h: 0.4, fontSize: 15, color: C.light, valign: "middle" });
  // QR a la app
  const qr = path.join(ASSETS, "marca", "qr-app.png");
  await QRCode.toFile(qr, APP_URL, { width: 700, margin: 1, color: { dark: "#0b4633", light: "#ffffff" } });
  const qx = 8.05, qy = 2.6, qw = 2.85;
  caja(s, qx, qy, qw, 3.55, { fill: C.white, shadow: true });
  s.addImage({ path: qr, x: qx + 0.2, y: qy + 0.2, w: qw - 0.4, h: qw - 0.4, altText: "Código QR para abrir la app de Reciclamigo" });
  tx(s, "Prueba la app", { x: qx + 0.2, y: qy + 2.78, w: qw - 0.4, h: 0.35, fontFace: "Arial", fontSize: 16, bold: true, color: C.dark, align: "center" });
  tx(s, "reciclamigo.vercel.app", { x: qx + 0.2, y: qy + 3.12, w: qw - 0.4, h: 0.3, fontSize: 13, color: C.soft, align: "center" });
  s.addNotes("Cierre. El plástico no termina aquí: publicar es gratis y el Plan Trazabilidad (US$14.99 al mes) es para quien necesita documentar lo que recicla. El QR abre la app para que prueben el demo.");
}

// ───────────────────────── Construcción ─────────────────────────
async function main() {
  await prepararIconos();
  const rutas = [
    marca("verde"), marca("claro"), nombre("lima"), arte("medio"), arte("claro"),
    ...["comercio-restaurante", "carreton-reciclador", "fabrica-resina", "paso-1-registro", "paso-2-publicar", "paso-3-alerta", "paso-4-retiro", "paso-5-confirmar"].map(ilus),
    ...["phone-m-publicar", "phone-m-mapa", "phone-m-lote", "phone-m-retiros", "comprobante-tarjeta", "reporte-pdf", "desktop-d-impacto", "insignia-tarjeta"].map(marco),
  ];
  await precargar(rutas);

  pres.layout = "LAYOUT_WIDE";
  pres.title = "Reciclamigo · DINAMICA FEST 2026";
  pres.author = "Equipo Reciclamigo";
  pres.company = "Reciclamigo";
  pres.subject = "Presentación del startup para DINAMICA FEST 2026";
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  definirPlantillas();

  portada();
  problema();
  fragmentado();
  solucion();
  publicarYEncontrar();
  confirmarYComprobar();
  trazabilidad();
  propuestaDeValor();
  mercado();
  competencia();
  modelo();
  marketing();
  piloto();
  proyeccion();
  escenarios();
  equipo();
  inversion();
  await cierre();

  await pres.writeFile({ fileName: SALIDA });
  fs.writeFileSync(path.join(AQUI, "theme.json"), JSON.stringify(THEME, null, 2));
  console.log("escrito:", SALIDA);
  if (FALTANTES.length) console.warn("imágenes faltantes (se dibujaron marcadores):", [...new Set(FALTANTES)].join(", "));
}

main().catch((e) => { console.error(e); process.exit(1); });
