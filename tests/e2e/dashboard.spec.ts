import { expect, test, type Page } from "@playwright/test";

import { arsipkanAkun, masuk, skipTanpaAkunUji } from "./helpers";

type Tx = { tipe: "income" | "expense" | "transfer"; nominal: string; akun: string; ke?: string; kategori?: string; tanggal: string; catatan: string };

async function catat(page: Page, t: Tx) {
  await page.goto(`/transaksi/baru?tipe=${t.tipe}`);
  await page.getByLabel("Nominal").fill(t.nominal);
  if (t.tipe === "transfer") {
    await page.getByLabel("Dari akun").selectOption({ label: t.akun });
    await page.getByLabel("Ke akun").selectOption({ label: t.ke! });
  } else {
    await page.getByLabel("Akun").selectOption({ label: t.akun });
    await page.getByLabel("Kategori").selectOption({ label: t.kategori! });
  }
  await page.getByLabel("Tanggal").fill(t.tanggal);
  await page.getByLabel("Catatan (opsional)").fill(t.catatan);
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page).toHaveURL(/tersimpan=1/);
}

test.describe("dashboard", () => {
  skipTanpaAkunUji();

  test("angka dashboard cocok dengan hitungan manual dari transaksi", async ({ page }, info) => {
    await masuk(page);
    // Tahun lampau yang unik per run & per proyek, agar tidak tercampur data lain.
    const tahun = 1950 + 2 * (Math.floor(Date.now() / 1000) % 25) + (info.project.name === "mobile" ? 1 : 0);
    const bulan = `${tahun}-03`;
    const tag = `dash ${info.project.name} ${Date.now()}`;
    const a1 = `E2E Dash A ${tag}`;
    const a2 = `E2E Dash B ${tag}`;

    for (const nama of [a1, a2]) {
      await page.goto("/akun/baru");
      await page.getByLabel("Nama akun").fill(nama);
      await page.getByLabel("Saldo awal").fill("0");
      await page.getByRole("button", { name: "Simpan" }).click();
      await expect(page).toHaveURL(/\/akun$/);
    }

    const txs: Tx[] = [
      { tipe: "income", nominal: "1000000", akun: a1, kategori: "Gaji", tanggal: `${bulan}-01`, catatan: `${tag} 1` },
      { tipe: "expense", nominal: "150000", akun: a1, kategori: "Makan & Minum", tanggal: `${bulan}-10`, catatan: `${tag} 2` },
      { tipe: "expense", nominal: "50000", akun: a1, kategori: "Transportasi", tanggal: `${bulan}-31`, catatan: `${tag} 3` },
      // Transfer tidak boleh dihitung sebagai pemasukan/pengeluaran.
      { tipe: "transfer", nominal: "100000", akun: a1, ke: a2, tanggal: `${bulan}-15`, catatan: `${tag} 4` },
      // Di luar periode (bulan berikutnya): tidak dihitung di ringkasan.
      { tipe: "expense", nominal: "999000", akun: a1, kategori: "Belanja", tanggal: `${tahun}-04-01`, catatan: `${tag} 5` },
    ];
    for (const t of txs) await catat(page, t);

    await page.goto(`/beranda?periode=kustom&dari=${bulan}-01&sampai=${bulan}-31`);
    await expect(page.getByTestId("dash-pemasukan")).toHaveText("Rp 1.000.000");
    await expect(page.getByTestId("dash-pengeluaran")).toHaveText("Rp 200.000");
    await expect(page.getByTestId("dash-selisih")).toHaveText("Rp 800.000");

    const rincian = page.getByRole("list", { name: /Pengeluaran per kategori/ });
    await expect(rincian).toHaveAccessibleName("Pengeluaran per kategori, total Rp 200.000");
    await expect(rincian.getByRole("listitem")).toHaveText([/Makan & Minum\s*Rp 150\.000 · 75%/, /Transportasi\s*Rp 50\.000 · 25%/]);

    // Arus kas per akun: transfer terpisah, tapi ikut mengubah saldo; transaksi April tidak dihitung.
    const perAkun = page.getByRole("region", { name: "Arus kas per akun" }).getByRole("listitem");
    const akunA = perAkun.filter({ hasText: a1 });
    await expect(akunA).toContainText("Masuk Rp 1.000.000");
    await expect(akunA).toContainText("Keluar Rp 200.000");
    await expect(akunA).toContainText("Transfer −Rp 100.000");
    await expect(akunA.getByLabel("Perubahan saldo +Rp 700.000")).toBeVisible();
    const akunB = perAkun.filter({ hasText: a2 });
    await expect(akunB).toContainText("Transfer +Rp 100.000");
    await expect(akunB.getByLabel("Perubahan saldo +Rp 100.000")).toBeVisible();
    await expect(page.getByText(/Tren \d+ bulan/)).toHaveCount(0);

    // Periode kustom tidak valid -> peringatan + kembali ke bulan ini.
    await page.goto(`/beranda?periode=kustom&dari=${bulan}-31&sampai=${bulan}-01`);
    await expect(page.getByRole("alert").filter({ hasText: "Rentang tanggal tidak valid" })).toBeVisible();

    // Bersihkan.
    for (const t of txs) {
      await page.goto(`/transaksi?bulan=${t.tanggal.slice(0, 7)}&cari=${encodeURIComponent(t.catatan)}`);
      await page.getByRole("main").getByRole("listitem").first().getByRole("link").click();
      await page.getByRole("button", { name: "Hapus transaksi" }).click();
      await page.getByRole("button", { name: "Ya, hapus" }).click();
      await expect(page.getByText("Transaksi dihapus.")).toBeVisible();
    }
    await arsipkanAkun(page, a1);
    await arsipkanAkun(page, a2);
  });
});
