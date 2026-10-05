import { expect, test } from "@playwright/test";

import { masuk, skipTanpaAkunUji } from "./helpers";

test.describe("tambah transaksi", () => {
  skipTanpaAkunUji();
  // Test ini menulis data ke akun uji; jalankan berurutan agar tidak saling tabrak.
  test.describe.configure({ mode: "serial" });

  test("catat pengeluaran dari tombol +", async ({ page }, info) => {
    await masuk(page);

    // Pastikan ada akun khusus test ini.
    const namaAkun = `E2E ${info.project.name} ${Date.now()}`;
    await page.goto("/akun/baru");
    await page.getByLabel("Nama akun").fill(namaAkun);
    await page.getByLabel("Saldo awal").fill("100000");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText(namaAkun)).toBeVisible();

    await page.goto("/beranda");
    await page.getByRole("link", { name: "Tambah transaksi" }).click();
    await expect(page).toHaveURL(/\/transaksi\/baru$/);

    // Nominal langsung fokus dan diformat otomatis.
    const nominal = page.getByLabel("Nominal");
    await expect(nominal).toBeFocused();
    await nominal.pressSequentially("12345");
    await expect(nominal).toHaveValue("12.345");

    await page.getByLabel("Akun").selectOption({ label: namaAkun });
    await page.getByLabel("Kategori").selectOption({ label: "Makan & Minum" });
    await page.getByLabel("Catatan (opsional)").fill("uji e2e");
    await page.getByRole("button", { name: "Simpan", exact: true }).click();

    await expect(page).toHaveURL(/\/transaksi\?tersimpan=1$/);
    await expect(page.getByText("Transaksi tersimpan.")).toBeVisible();
  });

  test("validasi: nominal dan kategori wajib", async ({ page }) => {
    await masuk(page);
    await page.goto("/transaksi/baru");
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(page.getByText("Nominal wajib diisi.")).toBeVisible();
    await expect(page.getByText("Pilih kategori.")).toBeVisible();
  });
});
