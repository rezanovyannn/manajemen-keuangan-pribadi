import { expect, test, type Page } from "@playwright/test";

import { masuk, skipTanpaAkunUji, tagUji } from "./helpers";
import { bacaProfilUji, ubahProfilUji } from "./support/profil-uji";

// Pilih opsi <select> berdasarkan awal teks label (label berisi saldo, mis. "E2E ... · bebas Rp 150.000").
async function pilihAwalan(page: Page, label: string, awalan: string) {
  const pilih = page.getByLabel(label);
  const value = await pilih.locator("option", { hasText: awalan }).first().getAttribute("value");
  await pilih.selectOption(value!);
}

test.describe("onboarding", () => {
  skipTanpaAkunUji();

  // Mengubah profil akun uji yang sama; jangan paralel dengan dirinya sendiri.
  test.describe.configure({ mode: "serial" });

  let asli: Awaited<ReturnType<typeof bacaProfilUji>>;
  test.beforeAll(async () => {
    asli = await bacaProfilUji();
  });
  test.afterAll(async () => {
    // Kembalikan profil akun uji seperti semula.
    await ubahProfilUji(asli);
  });

  test("pengguna baru diarahkan ke /mulai; 'Nanti saja' tidak mengarahkan lagi", async ({ page }) => {
    await masuk(page);
    await ubahProfilUji({ onboarding_completed_at: null });
    await page.goto("/beranda");
    await expect(page).toHaveURL(/\/mulai$/);
    await expect(page.getByRole("heading", { name: "Catat dalam hitungan detik" })).toBeVisible();

    await page.getByRole("button", { name: "Nanti saja" }).click();
    await expect(page).toHaveURL(/\/beranda$/);
    await page.goto("/beranda");
    await expect(page).toHaveURL(/\/beranda$/);
  });

  test("wizard lengkap: intro, nama, akun, budget, tagihan, tujuan, selesai", async ({ page }, info) => {
    await masuk(page);
    const tag = tagUji(info.project.name, "Wizard");
    const akun = `${tag} akun`;

    // Intro 3 layar.
    await page.goto("/mulai");
    await page.getByRole("link", { name: "Lanjut" }).click();
    await expect(page.getByRole("heading", { name: "Budget & tabungan terkendali" })).toBeVisible();
    await page.getByRole("link", { name: "Lanjut" }).click();
    await page.getByRole("link", { name: "Mulai atur" }).click();

    // Nama (dikembalikan di afterAll).
    await expect(page.getByText("Langkah 1 dari 6 · Nama")).toBeVisible();
    await page.getByLabel("Nama panggilan").fill("E2E Penguji");
    await page.getByRole("button", { name: "Lanjut" }).click();

    // Akun: pilihan cepat mengisi nama + jenis; nama diganti agar berawalan E2E.
    await expect(page.getByText("Langkah 2 dari 6 · Akun")).toBeVisible();
    await page.getByRole("button", { name: "OVO", exact: true }).click();
    await expect(page.getByLabel("Nama akun")).toHaveValue("OVO");
    await page.getByLabel("Nama akun").fill(akun);
    await page.getByLabel("Saldo saat ini").fill("150000");
    await page.getByRole("button", { name: "+ Tambah akun" }).click();
    await expect(page.getByText("Akun ditambahkan. Tambah lagi atau lanjut.")).toBeVisible();
    await expect(page.getByRole("list", { name: "Akun ditambahkan" })).toContainText(akun);
    await expect(page.getByLabel("Nama akun")).toHaveValue(""); // form kosong lagi
    await page.getByRole("button", { name: "Lanjut" }).click();

    // Budget: isian terisi budget yang sudah ada; simpan tanpa mengubah data akun uji.
    await expect(page.getByText("Langkah 3 dari 6 · Budget")).toBeVisible();
    await page.getByRole("button", { name: "Simpan & lanjut" }).click();

    // Tagihan rutin.
    await expect(page.getByText("Langkah 4 dari 6 · Tagihan rutin")).toBeVisible();
    await page.getByRole("button", { name: "Internet", exact: true }).click();
    await page.getByLabel("Nama", { exact: true }).fill(`${tag} internet`);
    await page.getByLabel("Nominal perkiraan").fill("123456");
    await page.getByLabel("Akun", { exact: true }).selectOption({ label: akun });
    await expect(page.getByLabel("Kategori")).toHaveValue(/.+/); // terisi dari contoh
    await page.getByRole("button", { name: "+ Tambah jadwal" }).click();
    await expect(page.getByText("Jadwal ditambahkan. Tambah lagi atau lanjut.")).toBeVisible();
    await expect(page.getByRole("list", { name: "Jadwal ditambahkan" })).toContainText(`${tag} internet`);
    await page.getByRole("link", { name: "Lanjut" }).click();

    // Tujuan + tabungan awal: melebihi saldo bebas ditolak (tujuan tidak dibuat ganda).
    await expect(page.getByText("Langkah 5 dari 6 · Tujuan tabungan")).toBeVisible();
    await page.getByLabel("Nama tujuan").fill(`${tag} tujuan`);
    await page.getByLabel("Target").fill("1000000");
    await pilihAwalan(page, "Sisihkan dari akun", akun);
    await page.getByLabel("Nominal tabungan awal").fill("200000");
    await page.getByRole("button", { name: "Simpan & lanjut" }).click();
    await expect(page.getByText("Melebihi saldo bebas di akun ini (maks. Rp 150.000).")).toBeVisible();
    await page.getByLabel("Nominal tabungan awal").fill("50000");
    await page.getByRole("button", { name: "Simpan & lanjut" }).click();

    // Selesai.
    await expect(page.getByRole("heading", { name: "Semua siap!" })).toBeVisible();
    await page.getByRole("button", { name: "Ke Beranda" }).click();
    await expect(page.getByText(/Selamat datang! Catat transaksi pertamamu/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Halo, E2E Penguji!" })).toBeVisible();

    // Data wizard tersimpan.
    await page.goto("/tujuan");
    const kartu = page.getByRole("link", { name: new RegExp(`${tag} tujuan`) });
    await expect(kartu).toHaveCount(1);
    await expect(kartu).toContainText("Rp 50.000 dari Rp 1.000.000");
  });

  test("checklist 'Mulai di sini' tampil dari data dan bisa ditutup", async ({ page }) => {
    await masuk(page);
    await ubahProfilUji({ checklist_dismissed_at: null });
    await page.goto("/beranda");
    const kartu = page.getByRole("region", { name: "Mulai di sini" });
    await expect(kartu).toBeVisible();
    // Akun uji sudah punya akun, transaksi, budget, jadwal, dan tujuan.
    await expect(kartu.getByRole("link", { name: /Catat transaksi pertama \(selesai\)/ })).toBeVisible();
    await expect(kartu.getByRole("link", { name: /Pasang aplikasi di HP \(belum\)/ })).toBeVisible();
    await expect(kartu).toContainText("5 dari 6 selesai");

    await kartu.getByRole("button", { name: "Tutup checklist" }).click();
    await expect(kartu).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("region", { name: "Mulai di sini" })).toHaveCount(0);
  });
});
