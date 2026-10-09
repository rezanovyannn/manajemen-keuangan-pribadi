import { expect, test, type Page } from "@playwright/test";

import { parseRupiah } from "../../src/lib/money/rupiah";
import { AKUN, hapusTransaksi, masuk, saldoAkun, skipTanpaAkunUji, tagUji } from "./helpers";

async function nominal(page: Page, path: string, testId: string) {
  await page.goto(path);
  const teks = (await page.getByTestId(testId).first().textContent()) ?? "";
  const n = parseRupiah(teks.replace("−", "-").replace("+", ""));
  expect(n, `${testId}: ${teks}`).not.toBeNull();
  return n!;
}

test.describe("investasi manual", () => {
  skipTanpaAkunUji();

  test("akun investasi: beli lewat transfer, perbarui nilai, untung, net worth, uang siap pakai", async ({ page }, info) => {
    await masuk(page);
    const nama = tagUji(info.project.name, "Emas");
    const catatan = `${nama} beli`;

    const briAwal = await saldoAkun(page, AKUN.bri);
    const saldoAwal = await nominal(page, "/beranda", "dash-saldo");
    const nwAwal = await nominal(page, "/net-worth", "net-worth");

    // Buat akun investasi.
    await page.goto("/akun/baru?jenis=investment");
    await page.getByLabel("Nama akun").fill(nama);
    await page.getByLabel("Jenis aset").selectOption({ label: "Emas" });
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page).toHaveURL(/\/akun$/);
    const kartu = page.getByRole("region", { name: "Investasi" }).getByRole("link", { name: new RegExp(`^${nama}`) });
    await expect(page.getByRole("region", { name: "Investasi" }).getByRole("region", { name: nama })).toContainText("Belum pernah diperbarui");

    // Beli Rp 1.000.000 dari BRI (transfer, akun tujuan terisi otomatis).
    await kartu.click();
    await page.getByRole("link", { name: "Beli" }).click();
    await expect(page.getByLabel("Ke akun")).toHaveValue(/.+/);
    await page.getByLabel("Nominal").fill("1000000");
    await page.getByLabel("Dari akun").selectOption({ label: AKUN.bri });
    await page.getByLabel("Catatan (opsional)").fill(catatan);
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(page).toHaveURL(/tersimpan=1/);

    // Uang siap pakai turun; net worth tetap (uang hanya pindah ke investasi).
    expect(await saldoAkun(page, AKUN.bri)).toBe(briAwal - 1_000_000);
    expect(await nominal(page, "/beranda", "dash-saldo")).toBe(saldoAwal - 1_000_000);
    expect(await nominal(page, "/net-worth", "net-worth")).toBe(nwAwal);

    // Perbarui cepat dari halaman Akun: harga 460.000/gram × 2,5 gram = Rp 1.150.000.
    await page.goto("/akun");
    await page.getByRole("button", { name: `Perbarui nilai ${nama}` }).click();
    const sheet = page.getByRole("dialog", { name: new RegExp(`Perbarui nilai · ${nama}`) });
    await sheet.getByRole("radio", { name: "Harga × unit" }).click();
    await sheet.getByLabel("Harga per unit").fill("460.000");
    await sheet.getByLabel("Jumlah unit").fill("2,5");
    await expect(sheet.getByText("Nilai sekarang: Rp 1.150.000")).toBeVisible();
    await sheet.getByRole("button", { name: "Simpan nilai" }).click();
    await expect(page).toHaveURL(/\/akun\?status=nilai-disimpan$/);
    await expect(page.getByText("Nilai investasi diperbarui.")).toBeVisible();
    const kartuAkun = page.getByRole("region", { name: "Investasi" }).getByRole("region", { name: nama });
    await expect(kartuAkun.getByTestId("investasi-nilai")).toHaveText("Rp 1.150.000");
    await expect(kartuAkun.getByTestId("investasi-perubahan")).toContainText("Naik Rp 150.000 (+15,0%)");
    await expect(kartuAkun.getByTestId("investasi-untung")).toHaveText("+Rp 150.000 (+15,0%)");
    await expect(kartuAkun).toContainText("2,5 unit");

    // Net worth naik sebesar untung; investasi tidak muncul di catat kilat.
    expect(await nominal(page, "/net-worth", "net-worth")).toBe(nwAwal + 150_000);
    await page.goto("/beranda");
    await page.getByRole("button", { name: "Tambah transaksi" }).click();
    const panel = page.getByRole("dialog", { name: "Catat kilat" });
    await expect(panel.getByRole("region", { name: "Akun" }).getByRole("button", { name: AKUN.bri, exact: true })).toBeVisible();
    await expect(panel.getByRole("region", { name: "Akun" }).getByRole("button", { name: nama })).toHaveCount(0);
    await page.keyboard.press("Escape");

    // Jual separuh nilai (Rp 575.000) ke BRI: modal turun proporsional → untung terealisasi Rp 75.000.
    await page.goto("/akun");
    await page.getByRole("region", { name: "Investasi" }).getByRole("link", { name: new RegExp(`^${nama}`) }).click();
    await page.getByRole("link", { name: "Jual" }).click();
    await page.getByLabel("Nominal").fill("575000");
    await page.getByLabel("Ke akun").selectOption({ label: AKUN.bri });
    await page.getByLabel("Catatan (opsional)").fill(`${nama} jual`);
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(page).toHaveURL(/tersimpan=1/);

    await page.goto("/akun");
    const setelahJual = page.getByRole("region", { name: "Investasi" }).getByRole("region", { name: nama });
    await expect(setelahJual.getByTestId("investasi-nilai")).toHaveText("Rp 575.000");
    await expect(setelahJual).toContainText("Modal");
    await expect(setelahJual).toContainText("Rp 500.000");
    await expect(setelahJual.getByTestId("investasi-untung")).toHaveText("+Rp 75.000 (+15,0%)");
    await expect(setelahJual.getByTestId("investasi-terealisasi")).toContainText("Untung terealisasi dari penjualan: +Rp 75.000");
    expect(await saldoAkun(page, AKUN.bri)).toBe(briAwal - 1_000_000 + 575_000);
    // Jual = transfer: net worth tidak berubah karena penjualan.
    expect(await nominal(page, "/net-worth", "net-worth")).toBe(nwAwal + 150_000);

    // Bersihkan: hapus transfer beli & jual (akun uji E2E dihapus global-teardown beserta riwayat nilainya).
    await hapusTransaksi(page, nama);
    expect(await saldoAkun(page, AKUN.bri)).toBe(briAwal);
  });
});
