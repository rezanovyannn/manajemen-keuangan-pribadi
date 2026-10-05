// Ubah kode error Supabase Auth menjadi pesan ramah berbahasa Indonesia.
// Detail teknis tetap dicatat di log server oleh pemanggil.

const PESAN: Record<string, string> = {
  invalid_credentials: "Email atau password salah.",
  email_not_confirmed: "Email belum dikonfirmasi. Cek kotak masuk email Anda.",
  user_already_exists: "Email ini sudah terdaftar. Silakan masuk.",
  email_exists: "Email ini sudah terdaftar. Silakan masuk.",
  weak_password: "Password terlalu lemah. Gunakan kombinasi huruf dan angka.",
  over_email_send_rate_limit: "Terlalu banyak permintaan email. Coba lagi beberapa menit lagi.",
  over_request_rate_limit: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.",
  signup_disabled: "Pendaftaran sedang ditutup.",
  email_address_invalid: "Alamat email tidak bisa dipakai. Gunakan email lain.",
};

export const PESAN_UMUM = "Terjadi kesalahan. Silakan coba lagi.";

export function pesanErrorAuth(code: string | undefined) {
  return (code && PESAN[code]) || PESAN_UMUM;
}
