// Kuvert moved from ./next/ to the site root. This replaces the worker that used to live here:
// it takes over, clears what that worker kept, steps aside, and sends open pages to the new address.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("kvnext-")).map((k) => caches.delete(k)));
      const home = new URL("../", self.registration.scope).href;
      await self.registration.unregister();
      for (const client of await self.clients.matchAll({ type: "window" })) {
        try {
          await client.navigate(home + new URL(client.url).hash);
        } catch {}
      }
    })(),
  );
});
