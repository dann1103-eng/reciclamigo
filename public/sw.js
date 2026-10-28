// Service worker de Reciclamigo. Solo sirve para los avisos push: no guarda nada en caché ni
// responde sin conexión. Se registra desde src/features/alerts/components/enable-push.tsx.

self.addEventListener("install", () => {
  // Una versión nueva toma el control sin esperar a que se cierren las pestañas.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Llega { title, body, url, tag } (src/lib/notify/messages.ts). Los navegadores exigen mostrar una
// notificación por cada push, así que siempre se muestra algo, aunque el contenido venga dañado.
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
    if (!data || typeof data !== "object") data = {};
  }

  const title = typeof data.title === "string" && data.title ? data.title : "Reciclamigo";
  const options = {
    body: typeof data.body === "string" ? data.body : "",
    icon: "/pwa-icon/192",
    data: { url: typeof data.url === "string" && data.url ? data.url : "/inicio" },
  };
  // Mismo tag = reemplaza al aviso anterior del mismo lote en vez de apilarse.
  if (typeof data.tag === "string" && data.tag) options.tag = data.tag;

  event.waitUntil(self.registration.showNotification(title, options));
});

// Al tocar el aviso: se usa una ventana de la app que ya esté abierta (y se lleva a la ruta del aviso)
// o se abre una nueva.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const rawUrl = (event.notification.data && event.notification.data.url) || "/inicio";
  let target = new URL("/inicio", self.location.origin).href;
  try {
    const parsed = new URL(rawUrl, self.location.origin);
    if (parsed.origin === self.location.origin) target = parsed.href;
  } catch {
    // url inválida: se queda /inicio
  }

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin && "focus" in client);
      if (open) {
        // Algunos navegadores no dejan navegar una ventana ajena a este worker; igual se enfoca.
        const navigated = await open.navigate(target).catch(() => null);
        return (navigated || open).focus();
      }
      return self.clients.openWindow(target);
    })(),
  );
});
