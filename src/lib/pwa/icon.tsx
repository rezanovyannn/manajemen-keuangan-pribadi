import { ImageResponse } from "next/og";

// Ikon aplikasi digambar lewat kode (tanpa file desain): tulisan "Rp" di kotak gelap
// dengan garis aksen biru. `maskable`: konten diperkecil ke zona aman (±80%) agar tidak
// terpotong saat Android memotong ikon menjadi lingkaran/kotak membulat.
export function renderAppIcon(size: number, opsi: { maskable?: boolean; rounded?: boolean } = {}) {
  const skala = opsi.maskable ? 0.72 : 1;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0b0b",
          borderRadius: opsi.rounded ? size * 0.22 : 0,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: size * 0.03 * skala,
          }}
        >
          <div
            style={{
              color: "#ffffff",
              fontSize: size * 0.42 * skala,
              fontWeight: 700,
              letterSpacing: -size * 0.01 * skala,
              lineHeight: 1,
            }}
          >
            Rp
          </div>
          <div
            style={{
              width: size * 0.38 * skala,
              height: Math.max(2, size * 0.045 * skala),
              borderRadius: size,
              background: "#3987e5",
            }}
          />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
