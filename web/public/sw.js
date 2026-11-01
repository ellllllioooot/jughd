/* Jughd service worker: notification display path (research §3).
   Posture alerts are client-side — the page messages this worker and the
   notification shows regardless of tab focus. */

self.addEventListener("message", (event) => {
  const data = event.data;
  if (data && data.type === "show-notification") {
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        tag: data.tag,
        dir: "rtl",
        lang: "fa",
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow("/");
    })
  );
});

// Server-initiated Web Push (quota warnings etc.) — posture alerts never
// round-trip through the server (research §3).
self.addEventListener("push", (event) => {
  let payload = { title: "جغد", body: "" };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    /* keep defaults */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      dir: "rtl",
      lang: "fa",
    })
  );
});
