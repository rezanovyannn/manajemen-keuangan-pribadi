// Aturan akses halaman, dipakai oleh src/proxy.ts.

export const HALAMAN_SETELAH_MASUK = "/beranda";
export const HALAMAN_MASUK = "/masuk";

// Halaman yang hanya boleh dibuka pengguna yang sudah login.
// Setiap halaman baru di src/app/(app)/ wajib ditambahkan di sini.
const PREFIX_TERLINDUNGI = ["/beranda", "/transaksi", "/akun", "/budget", "/profil", "/kategori", "/berulang", "/tujuan", "/utang", "/net-worth", "/insight", "/mulai"];

// Halaman khusus tamu: pengguna yang sudah login diarahkan ke beranda.
const HALAMAN_TAMU = ["/masuk", "/daftar"];

function cocok(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedPath(pathname: string) {
  return PREFIX_TERLINDUNGI.some((p) => cocok(pathname, p));
}

export function isGuestOnlyPath(pathname: string) {
  return HALAMAN_TAMU.some((p) => cocok(pathname, p));
}

// Hanya izinkan redirect ke path internal agar ?next= tidak bisa dipakai
// untuk mengarahkan pengguna ke situs lain (open redirect).
export function safeNextPath(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return HALAMAN_SETELAH_MASUK;
  }
  return next;
}
