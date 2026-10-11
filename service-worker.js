self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "ShumDev Control", {
      body: data.body || "Новое уведомление",
      icon: "/site/image/pwa-192.png",
      badge: "/site/image/pwa-192.png",
      requireInteraction: true,
      tag: data.tag || "shumdev-control",
      renotify: true,
      data: {
        url: data.url || "/control/app.html#/overview",
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target =
    event.notification.data?.url || "/control/app.html#/overview";
  const absoluteTarget = new URL(target, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windows) => {
        const controlWindow = windows.find((client) =>
          client.url.includes("/control/"),
        );

        if (controlWindow) {
          await controlWindow.navigate(absoluteTarget);
          return controlWindow.focus();
        }

        return self.clients.openWindow(absoluteTarget);
      }),
  );
});
