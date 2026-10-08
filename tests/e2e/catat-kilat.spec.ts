import { expect, test, type Page } from "@playwright/test";

import { AKUN, catat, cariTransaksi, hapusTransaksi, masuk, skipTanpaAkunUji, tagUji } from "./helpers";

async function bukaKilat(page: Page) {
  await page.getByRole("button", { name: "Tambah transaksi" }).click();
  const panel = page.getByRole("dialog", { name: "Catat kilat" });
  await expect(panel.getByRole("group", { name: "Keypad nominal" })).toBeVisible();
  return panel;
}

async function ketik(panel: ReturnType<Page["getByRole"]>, angka: string[]) {
  for (const a of angka) await panel.getByRole("group", { name: "Keypad nominal" }).getByRole("button", { name: a, exact: true }).click();
}

test.describe("catat kilat", () => {
  skipTanpaAkunUji();

  test("keypad, kategori ditebak dari catatan, akun, simpan tanpa pindah halaman", async ({ page }, info) => {
    await masuk(page);
    const catatan = `${tagUji(info.project.name, "kilat")} gojek`;
    const panel = await bukaKilat(page);

    await ketik(panel, ["1", "2", "000"]);
    await expect(panel.getByTestId("kilat-nominal")).toHaveText("Rp 12.000");
    await panel.getByRole("button", { name: "Hapus angka" }).click();
    await panel.getByRole("button", { name: "0", exact: true }).click();
    await expect(panel.getByTestId("kilat-nominal")).toHaveText("Rp 12.000");

    // Akun uji punya riwayat "Gojek" → Transportasi.
    await panel.getByLabel("Catatan (opsional)").fill(catatan);
    await expect(panel.getByText("ditebak dari catatan")).toBeVisible();
    await expect(panel.getByRole("region", { name: "Kategori" }).getByRole("button", { name: "Transportasi", exact: true })).toHaveAttribute("aria-pressed", "true");

    await panel.getByRole("region", { name: "Akun" }).getByRole("button", { name: AKUN.cash, exact: true }).click();
    await panel.getByRole("button", { name: "Simpan Rp 12.000" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Pengeluaran Rp 12.000 tersimpan" })).toBeVisible();
    await expect(panel).toHaveCount(0);
    await expect(page).toHaveURL(/\/beranda$/); // tidak pindah halaman

    const daftar = await cariTransaksi(page, catatan);
    await expect(daftar).toHaveCount(1);
    await expect(daftar.first()).toContainText("Transportasi");
    await expect(daftar.first()).toContainText(AKUN.cash);
    await expect(daftar.first()).toContainText("−Rp 12.000");
    await hapusTransaksi(page, catatan);
  });

  test("Batalkan dari toast menghapus transaksi; pemasukan memakai kategori pemasukan", async ({ page }, info) => {
    await masuk(page);
    const catatan = tagUji(info.project.name, "kilat batal");
    const panel = await bukaKilat(page);
    await panel.getByRole("radio", { name: "Masuk" }).click();
    await ketik(panel, ["7", "7", "7"]);
    await panel.getByRole("region", { name: "Kategori" }).getByRole("button", { name: "Bonus", exact: true }).click();
    await panel.getByLabel("Catatan (opsional)").fill(catatan);
    await panel.getByRole("button", { name: "Simpan Rp 777" }).click();
    const toast = page.getByRole("status").filter({ hasText: "Pemasukan Rp 777 tersimpan" });
    await expect(toast).toBeVisible();
    await toast.getByRole("button", { name: "Batalkan" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Transaksi dibatalkan." })).toBeVisible();
    await expect(await cariTransaksi(page, catatan)).toHaveCount(0);
  });

  test("favorit: transaksi yang sering diulang tersimpan dengan 1 ketukan", async ({ page }, info) => {
    await masuk(page);
    const catatan = tagUji(info.project.name, "kilat favorit");
    for (let i = 0; i < 3; i++) await catat(page, { tipe: "expense", nominal: "4321", akun: AKUN.cash, kategori: "Makan & Minum", catatan });

    await page.goto("/beranda");
    const panel = await bukaKilat(page);
    await panel.getByRole("region", { name: "Sering dicatat" }).getByRole("button", { name: `Catat ${catatan} Rp 4.321` }).click();
    const toast = page.getByRole("status").filter({ hasText: `${catatan} Rp 4.321 tersimpan` });
    await expect(toast).toBeVisible();
    await expect(await cariTransaksi(page, catatan)).toHaveCount(4);

    await hapusTransaksi(page, catatan);
  });
});
