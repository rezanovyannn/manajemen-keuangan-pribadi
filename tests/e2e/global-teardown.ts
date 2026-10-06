import { bersihkanAkunUji } from "./support/bersihkan";

// Setelah semua E2E selesai: hapus data uji berawalan "E2E" dari akun uji,
// supaya akun uji tidak menumpuk data (akun BRI/Mandiri/GoPay/Cash On Hand tetap).
export default async function globalTeardown() {
  const hasil = await bersihkanAkunUji("e2e");
  if (hasil) console.log("[e2e] data uji dibersihkan:", hasil.ringkasan);
}
