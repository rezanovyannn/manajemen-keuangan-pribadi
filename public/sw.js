// Service worker Keuangan Pribadi.
// - Navigasi halaman: selalu coba jaringan dulu (data selalu terbaru). Jika gagal (offline),
//   tampilkan halaman /offline (form catat offline) dari cache.
// - Aset statis Next.js (/_next/static, nama file ber-hash): cache-first.
// - Tidak menyimpan halaman/data pengguna di cache; hanya /offline (tanpa data) dan asetnya.

const VERSI = "keuangan-v1";
const HALAMAN_OFFLINE = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSI);
      const res = await fetch(HALAMAN_OFFLINE, { cache: "no-store" });
      if (!res.ok) return;
      await cache.put(HALAMAN_OFFLINE, res.clone());
      // Simpan juga skrip & stylesheet yang dipakai halaman /offline.
      const html = await res.text();
      const aset = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) ?? [])];
      await Promise.all(aset.map((url) => cache.add(url).catch(() => undefined)));
    })().then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const kunci = await caches.keys();
      await Promise.all(kunci.filter((k) => k !== VERSI).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => (await caches.match(HALAMAN_OFFLINE)) ?? Response.error()),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSI);
        const ada = await cache.match(req);
        if (ada) return ada;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })(),
    );
  }
});
