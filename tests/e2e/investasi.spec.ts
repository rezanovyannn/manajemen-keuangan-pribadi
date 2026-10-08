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
    await expect(kartu).toContainText("belum pernah diperbarui");

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

    // Perbarui nilai: Rp 1.150.000, 2,5 gram → untung Rp 150.000 (+15,0%).
    await page.goto("/akun");
    await page.getByRole("region", { name: "Investasi" }).getByRole("link", { name: new RegExp(`^${nama}`) }).click();
    await page.getByLabel("Nilai sekarang").fill("1150000");
    await page.getByLabel("Unit (opsional)").fill("2,5");
    await page.getByRole("button", { name: "Simpan nilai" }).click();
    await expect(page.getByText("Nilai investasi diperbarui.")).toBeVisible();
    const detail = page.getByRole("region", { name: nama });
    await expect(detail.getByTestId("investasi-nilai")).toHaveText("Rp 1.150.000");
    await expect(detail.getByTestId("investasi-untung")).toHaveText("+Rp 150.000(+15,0%)");
    await expect(detail).toContainText("2,5 unit");
    await expect(detail).toContainText("Modal Rp 1.000.000");
    await expect(page.getByRole("region", { name: "Riwayat nilai" }).getByRole("listitem")).toHaveCount(1);

    // Net worth naik sebesar untung; investasi tidak muncul di catat kilat.
    expect(await nominal(page, "/net-worth", "net-worth")).toBe(nwAwal + 150_000);
    await page.goto("/beranda");
    await page.getByRole("button", { name: "Tambah transaksi" }).click();
    const panel = page.getByRole("dialog", { name: "Catat kilat" });
    await expect(panel.getByRole("region", { name: "Akun" }).getByRole("button", { name: AKUN.bri, exact: true })).toBeVisible();
    await expect(panel.getByRole("region", { name: "Akun" }).getByRole("button", { name: nama })).toHaveCount(0);
    await page.keyboard.press("Escape");

    // Bersihkan: hapus transfer (akun uji E2E dihapus global-teardown beserta riwayat nilainya).
    await hapusTransaksi(page, catatan);
    expect(await saldoAkun(page, AKUN.bri)).toBe(briAwal);
  });
});
