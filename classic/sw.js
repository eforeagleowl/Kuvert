// Kuvert Classic has retired; its page here now forwards to Kuvert. This replaces the worker that kept
// Classic offline: it takes over, clears what that worker kept and steps aside, so the next visit gets
// the forwarding page. Progress lives in the browser's storage, which both apps shared, so nothing is lost.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("kuvert-classic-")).map((k) => caches.delete(k)));
      await self.registration.unregister();
    })(),
  );
});
