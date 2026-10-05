// Ubah error database transaksi menjadi pesan ramah berbahasa Indonesia.
// Pesan dari trigger/fungsi database (kode P0001/P0002) dipetakan berdasarkan teksnya.

const PESAN_DB: Record<string, string> = {
  "Akun sudah diarsipkan": "Akun sudah diarsipkan. Pilih akun lain.",
  "Kategori sudah diarsipkan": "Kategori sudah diarsipkan. Pilih kategori lain.",
  "Akun asal dan tujuan harus berbeda": "Akun tujuan harus berbeda dari akun asal.",
  "Transfer tidak ditemukan": "Transaksi tidak ditemukan.",
};

export const PESAN_GAGAL_TRANSAKSI = "Transaksi gagal disimpan. Silakan coba lagi.";

export function pesanErrorTransaksi(error: { code?: string; message?: string }) {
  if (error.message && PESAN_DB[error.message]) return PESAN_DB[error.message];
  if (error.code === "23503") return "Akun atau kategori tidak valid untuk transaksi ini.";
  return PESAN_GAGAL_TRANSAKSI;
}
