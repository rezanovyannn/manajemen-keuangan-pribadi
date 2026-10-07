import type { MetadataRoute } from "next";

// Manifest PWA: aplikasi bisa dipasang di layar utama HP dan dibuka layar penuh.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Keuangan Pribadi",
    short_name: "Keuangan",
    description: "Catat transaksi, kelola dompet, dan pantau budget bulanan.",
    lang: "id",
    start_url: "/beranda",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0b0b0b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
