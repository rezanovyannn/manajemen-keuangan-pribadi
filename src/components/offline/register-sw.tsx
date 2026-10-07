"use client";

import { useEffect } from "react";

// Daftarkan service worker (hanya di build produksi agar pengembangan tidak terganggu cache).
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Gagal mendaftar tidak boleh mengganggu aplikasi; fitur offline saja yang tidak aktif.
    });
  }, []);
  return null;
}
