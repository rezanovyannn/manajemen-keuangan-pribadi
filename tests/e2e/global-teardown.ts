import fs from "node:fs";

import { FILE_PROFIL } from "./global-setup";
import { bersihkanAkunUji } from "./support/bersihkan";
import { ubahProfilUji } from "./support/profil-uji";

// Setelah semua E2E selesai: hapus data uji berawalan "E2E" dari akun uji,
// supaya akun uji tidak menumpuk data (akun BRI/Mandiri/GoPay/Cash On Hand tetap),
// lalu kembalikan flag onboarding/checklist akun uji seperti sebelum E2E.
export default async function globalTeardown() {
  const hasil = await bersihkanAkunUji("e2e");
  if (hasil) console.log("[e2e] data uji dibersihkan:", hasil.ringkasan);
  if (fs.existsSync(FILE_PROFIL)) {
    await ubahProfilUji(JSON.parse(fs.readFileSync(FILE_PROFIL, "utf8")));
    fs.rmSync(FILE_PROFIL);
  }
}
