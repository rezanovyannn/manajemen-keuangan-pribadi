import { expect, test } from "@playwright/test";

import { AKUN, catat, cariTransaksi, hapusTransaksi, masuk, saldoAkun, skipTanpaAkunUji, tagUji } from "./helpers";

test.describe("saldo akun", () => {
  skipTanpaAkunUji();

  test("konsisten dengan riwayat transaksi, termasuk setelah edit dan hapus", async ({ page }, info) => {
    await masuk(page);
    const makan = tagUji(info.project.name, "makan");
    const gaji = tagUji(info.project.name, "gaji");
    const tarik = tagUji(info.project.name, "tarik");
    // Selisih dihitung dari saldo awal saat test mulai (akun tetap bisa sudah berisi data).
    const awalCash = await saldoAkun(page, AKUN.cash);
    const awalBri = await saldoAkun(page, AKUN.bri);
    const cek = async (cash: number, bri: number) => {
      expect(await saldoAkun(page, AKUN.cash)).toBe(awalCash + cash);
      expect(await saldoAkun(page, AKUN.bri)).toBe(awalBri + bri);
    };

    await catat(page, { tipe: "expense", nominal: "25000", akun: AKUN.cash, kategori: "Makan & Minum", catatan: makan });
    await catat(page, { tipe: "income", nominal: "100000", akun: AKUN.bri, kategori: "Gaji", catatan: gaji });
    await catat(page, { tipe: "transfer", nominal: "50000", akun: AKUN.bri, ke: AKUN.cash, catatan: tarik });
    await cek(-25_000 + 50_000, 100_000 - 50_000);

    // Edit pengeluaran 25.000 -> 30.000.
    let daftar = await cariTransaksi(page, makan);
    await daftar.first().getByRole("link").click();
    await page.getByLabel("Nominal").fill("30000");
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(page.getByText("Perubahan tersimpan.")).toBeVisible();
    await cek(-30_000 + 50_000, 50_000);

    // Edit transfer 50.000 -> 80.000 (kedua sisi ikut berubah).
    daftar = await cariTransaksi(page, tarik);
    await daftar.first().getByRole("link").click();
    await page.getByLabel("Nominal").fill("80000");
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(page.getByText("Perubahan tersimpan.")).toBeVisible();
    await cek(-30_000 + 80_000, 100_000 - 80_000);

    // Hapus transfer: kedua sisi hilang.
    await hapusTransaksi(page, tarik);
    await cek(-30_000, 100_000);

    // Bersihkan: saldo kembali seperti awal.
    await hapusTransaksi(page, makan);
    await hapusTransaksi(page, gaji);
    await cek(0, 0);
  });
});
