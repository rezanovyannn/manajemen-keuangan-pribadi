import { expect, test } from "@playwright/test";

import { AKUN, catat, hapusTransaksi, masuk, skipTanpaAkunUji, tagUji, type TxUji } from "./helpers";

test.describe("dashboard", () => {
  skipTanpaAkunUji();

  test("angka dashboard cocok dengan hitungan manual dari transaksi", async ({ page }, info) => {
    await masuk(page);
    // Tahun lampau yang unik per run & per proyek: periode ini hanya berisi transaksi test ini.
    const tahun = 1950 + 2 * (Math.floor(Date.now() / 1000) % 25) + (info.project.name === "mobile" ? 1 : 0);
    const bulan = `${tahun}-03`;
    const tag = tagUji(info.project.name, "dash");

    const txs: TxUji[] = [
      { tipe: "income", nominal: "1000000", akun: AKUN.bri, kategori: "Gaji", tanggal: `${bulan}-01`, catatan: `${tag} 1` },
      { tipe: "expense", nominal: "150000", akun: AKUN.bri, kategori: "Makan & Minum", tanggal: `${bulan}-10`, catatan: `${tag} 2` },
      { tipe: "expense", nominal: "50000", akun: AKUN.bri, kategori: "Transportasi", tanggal: `${bulan}-31`, catatan: `${tag} 3` },
      // Transfer tidak dihitung sebagai pemasukan/pengeluaran.
      { tipe: "transfer", nominal: "100000", akun: AKUN.bri, ke: AKUN.mandiri, tanggal: `${bulan}-15`, catatan: `${tag} 4` },
      // Di luar periode (bulan berikutnya).
      { tipe: "expense", nominal: "999000", akun: AKUN.bri, kategori: "Belanja", tanggal: `${tahun}-04-01`, catatan: `${tag} 5` },
    ];
    for (const t of txs) await catat(page, t);

    await page.goto(`/beranda?periode=kustom&dari=${bulan}-01&sampai=${bulan}-31`);
    await expect(page.getByTestId("dash-pemasukan")).toHaveText("Rp 1.000.000");
    await expect(page.getByTestId("dash-pengeluaran")).toHaveText("Rp 200.000");
    await expect(page.getByTestId("dash-selisih")).toHaveText("Rp 800.000");

    const rincian = page.getByRole("list", { name: /Pengeluaran per kategori/ });
    await expect(rincian).toHaveAccessibleName("Pengeluaran per kategori, total Rp 200.000");
    await expect(rincian.getByRole("listitem")).toHaveText([/Makan & Minum\s*Rp 150\.000 · 75%/, /Transportasi\s*Rp 50\.000 · 25%/]);

    // Arus kas per akun: transfer terpisah tapi ikut mengubah saldo; transaksi April tidak dihitung.
    const perAkun = page.getByRole("region", { name: "Arus kas per akun" });
    const bri = perAkun.getByRole("article", { name: AKUN.bri });
    await expect(bri.getByLabel("Masuk Rp 1.000.000")).toBeVisible();
    await expect(bri.getByLabel("Keluar Rp 200.000")).toBeVisible();
    await expect(bri.getByLabel("Transfer −Rp 100.000")).toBeVisible();
    await expect(bri.getByLabel("Perubahan saldo +Rp 700.000")).toBeVisible();
    const mandiri = perAkun.getByRole("article", { name: AKUN.mandiri });
    await expect(mandiri.getByLabel("Masuk Rp 0")).toBeVisible();
    await expect(mandiri.getByLabel("Transfer +Rp 100.000")).toBeVisible();
    await expect(mandiri.getByLabel("Perubahan saldo +Rp 100.000")).toBeVisible();
    await expect(page.getByText(/Tren \d+ bulan/)).toHaveCount(0);

    // Periode kustom tidak valid -> peringatan + kembali ke bulan ini.
    await page.goto(`/beranda?periode=kustom&dari=${bulan}-31&sampai=${bulan}-01`);
    await expect(page.getByRole("alert").filter({ hasText: "Rentang tanggal tidak valid" })).toBeVisible();

    // Bersihkan.
    for (const t of txs) await hapusTransaksi(page, t.catatan, t.tanggal!.slice(0, 7));
  });
});
