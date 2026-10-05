import { expect, test } from "@playwright/test";

import { masuk, skipTanpaAkunUji } from "./helpers";

test.describe("akun dan kategori", () => {
  skipTanpaAkunUji();

  test("tambah akun: saldo awal tampil dalam format Rupiah", async ({ page }, info) => {
    await masuk(page);
    const nama = `E2E Rupiah ${info.project.name} ${Date.now()}`;

    await page.goto("/akun/baru");
    await page.getByLabel("Nama akun").fill(nama);
    await page.getByText("E-wallet").click();
    await page.getByLabel("Saldo awal").fill("1250000");
    await expect(page.getByLabel("Saldo awal")).toHaveValue("1.250.000");
    await page.getByRole("button", { name: "Simpan" }).click();

    const baris = page.getByRole("link", { name: new RegExp(nama) });
    await expect(baris).toContainText("E-wallet");
    await expect(baris).toContainText("Rp 1.250.000");

    // Bersihkan: arsipkan akun uji.
    await baris.click();
    await page.getByRole("button", { name: "Arsipkan akun" }).click();
    await expect(page).toHaveURL(/\/akun$/);
    await expect(page.getByRole("link", { name: new RegExp(nama) })).toHaveCount(0);
  });

  test("kategori default, sub-kategori, arsip, dan pulihkan", async ({ page }, info) => {
    await masuk(page);
    await page.goto("/kategori");

    for (const nama of ["Makan & Minum", "Transportasi", "Tagihan", "Lainnya"]) {
      await expect(page.getByRole("link", { name: nama, exact: true })).toBeVisible();
    }
    await page.getByRole("link", { name: "Pemasukan" }).click();
    await expect(page.getByRole("link", { name: "Gaji", exact: true })).toBeVisible();

    // Sub-kategori pengeluaran baru di bawah Makan & Minum.
    const sub = `E2E Kopi ${info.project.name} ${Date.now()}`;
    await page.goto("/kategori/baru?tipe=pengeluaran");
    await page.getByLabel("Nama kategori").fill(sub);
    await page.getByLabel("Masuk ke dalam").selectOption({ label: "Makan & Minum" });
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page).toHaveURL(/\/kategori\?tipe=pengeluaran$/);

    await page.getByRole("link", { name: sub }).click();
    await expect(page.getByText("Pengeluaran · sub-kategori")).toBeVisible();
    await page.getByRole("button", { name: "Arsipkan kategori" }).click();
    await expect(page.getByRole("link", { name: sub })).toHaveCount(0);

    await page.getByText(/^Diarsipkan/).click();
    const arsip = page.getByRole("listitem").filter({ hasText: sub });
    await arsip.getByRole("button", { name: "Pulihkan" }).click();
    await expect(page.getByRole("link", { name: sub })).toBeVisible();

    // Bersihkan: arsipkan lagi (tunggu sampai benar-benar tersimpan).
    await page.getByRole("link", { name: sub }).click();
    await page.getByRole("button", { name: "Arsipkan kategori" }).click();
    await expect(page).toHaveURL(/\/kategori\?tipe=pengeluaran$/);
    await expect(page.getByRole("link", { name: sub })).toHaveCount(0);
  });
});
