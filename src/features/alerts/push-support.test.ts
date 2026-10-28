import { describe, expect, test } from "vitest";

import { applicationServerKey, isIosDevice, pushSupport, sameKey, type PushEnv } from "./push-support";

const base: PushEnv = {
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
  isIos: false,
  isStandalone: false,
  publicKey: "BPublica",
  permission: "default",
};

describe("pushSupport", () => {
  test("navegador completo con llave y permiso por pedir: listo", () => {
    expect(pushSupport(base)).toBe("ready");
    expect(pushSupport({ ...base, permission: "granted" })).toBe("ready");
  });

  test("sin llave pública los avisos no están configurados (aunque todo lo demás sirva)", () => {
    expect(pushSupport({ ...base, publicKey: undefined })).toBe("unconfigured");
    expect(pushSupport({ ...base, publicKey: "" })).toBe("unconfigured");
    expect(pushSupport({ ...base, publicKey: "   " })).toBe("unconfigured");
  });

  test("iPhone con el sitio abierto en Safari: primero hay que instalar la app", () => {
    expect(pushSupport({ ...base, isIos: true, hasPushManager: false })).toBe("needs-install");
    expect(pushSupport({ ...base, isIos: true })).toBe("needs-install");
  });

  test("iPhone con la app instalada: listo", () => {
    expect(pushSupport({ ...base, isIos: true, isStandalone: true })).toBe("ready");
  });

  test("navegador sin service worker, push o notificaciones: no soportado", () => {
    expect(pushSupport({ ...base, hasServiceWorker: false })).toBe("unsupported");
    expect(pushSupport({ ...base, hasPushManager: false })).toBe("unsupported");
    expect(pushSupport({ ...base, hasNotification: false })).toBe("unsupported");
  });

  test("permiso negado: bloqueado", () => {
    expect(pushSupport({ ...base, permission: "denied" })).toBe("blocked");
  });
});

describe("isIosDevice", () => {
  test("iPhone, iPad y iPod", () => {
    expect(isIosDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15", "iPhone", 5)).toBe(true);
    expect(isIosDevice("Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X)", "iPad", 5)).toBe(true);
    expect(isIosDevice("Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)", "iPod", 5)).toBe(true);
  });

  test("un iPad nuevo se presenta como Mac, pero tiene pantalla táctil", () => {
    expect(isIosDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15", "MacIntel", 5)).toBe(true);
  });

  test("una Mac de verdad, Android y Windows no", () => {
    expect(isIosDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15", "MacIntel", 0)).toBe(false);
    expect(isIosDevice("Mozilla/5.0 (Linux; Android 14; SM-A145M) AppleWebKit/537.36 Chrome/124.0", "Linux armv81", 5)).toBe(false);
    expect(isIosDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0", "Win32", 0)).toBe(false);
  });
});

describe("applicationServerKey y sameKey", () => {
  test("pasa la llave pública VAPID (base64 URL) a bytes", () => {
    // "AQIDBA" = bytes 1,2,3,4
    expect(Array.from(applicationServerKey("AQIDBA"))).toEqual([1, 2, 3, 4]);
    // con - y _ del alfabeto URL: "-_8" son 0xfb 0xff
    expect(Array.from(applicationServerKey("-_8"))).toEqual([0xfb, 0xff]);
  });

  test("compara la llave de una suscripción existente con la actual", () => {
    const key = applicationServerKey("AQIDBA");
    expect(sameKey(new Uint8Array([1, 2, 3, 4]).buffer, key)).toBe(true);
    expect(sameKey(new Uint8Array([1, 2, 3, 5]).buffer, key)).toBe(false);
    expect(sameKey(new Uint8Array([1, 2, 3]).buffer, key)).toBe(false);
    expect(sameKey(null, key)).toBe(false);
  });
});
