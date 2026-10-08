import fs from "node:fs";
import path from "node:path";

import { bacaProfilUji, ubahProfilUji } from "./support/profil-uji";

export const FILE_PROFIL = path.join("test-results", ".profil-uji.json");

// Sebelum E2E: tandai onboarding akun uji selesai (agar login mendarat di Beranda), simpan
// flag aslinya, dan kembalikan di global-teardown. Akun uji boleh sedang dicoba manual.
export default async function globalSetup() {
  if (!process.env.E2E_EMAIL && !fs.existsSync(".env.local")) return;
  let asli;
  try {
    asli = await bacaProfilUji();
  } catch {
    return; // tanpa akun uji (CI): test terkait di-skip
  }
  // Jangan menimpa cadangan dari run sebelumnya yang belum sempat dipulihkan.
  if (!fs.existsSync(FILE_PROFIL)) {
    fs.mkdirSync("test-results", { recursive: true });
    fs.writeFileSync(
      FILE_PROFIL,
      JSON.stringify({ onboarding_completed_at: asli.onboarding_completed_at, checklist_dismissed_at: asli.checklist_dismissed_at }),
    );
  }
  const sekarang = new Date().toISOString();
  await ubahProfilUji({ onboarding_completed_at: sekarang, checklist_dismissed_at: sekarang });
}
