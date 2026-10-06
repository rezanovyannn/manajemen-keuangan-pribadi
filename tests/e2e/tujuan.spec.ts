import { expect, test } from "@playwright/test";

import { addDays, todayInJakarta } from "../../src/lib/dates";
import { formatRupiah } from "../../src/lib/money/rupiah";
import { AKUN, bukaMenu, catat, hapusTransaksi, masuk, saldoAkun, skipTanpaAkunUji, tagUji } from "./helpers";

test.describe("tujuan tabungan", () => {
  skipTanpaAkunUji();

  test("progress dari saldo akun, setoran per bulan, tercapai, hapus", async ({ page }, info) => {
    await masuk(page);
    const setoran = tagUji(info.project.name, "setoran tabungan");
    const tujuan = tagUji(info.project.name, "Liburan");
    // Cash On Hand: Mandiri dipakai tujuan tabungan contoh di akun uji (satu tujuan aktif per akun).
    const akun = AKUN.cash;
    const target = 10_000_000;

    // Isi Rp 4.200.000 ke akun; progress = saldo akun itu.
    const awal = await saldoAkun(page, akun);
    await catat(page, { tipe: "income", nominal: "4200000", akun, kategori: "Bonus", catatan: setoran });
    const saldo = awal + 4_200_000;
    const persen = Math.min(100, Math.max(0, Math.floor((saldo * 100) / target)));

    await bukaMenu(page, "Tujuan tabungan");
    await page.getByRole("link", { name: "Tambah" }).click();
    await page.getByLabel("Nama tujuan").fill(tujuan);
    await page.getByLabel("Target").fill(String(target));
    await page.getByLabel("Akun tabungan").selectOption({ label: akun });
    // Tenggat ~8 bulan lagi.
    const t = todayInJakarta();
    const [y, m, d] = t.split("-").map(Number) as [number, number, number];
    const bulan = m + 8;
    const tenggat = `${y + Math.floor((bulan - 1) / 12)}-${String(((bulan - 1) % 12) + 1).padStart(2, "0")}-${String(Math.min(d, 28)).padStart(2, "0")}`;
    await page.getByLabel("Tenggat (opsional)").fill(tenggat);
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Tujuan tersimpan.")).toBeVisible();

    const kartu = page.getByRole("link", { name: new RegExp(tujuan) });
    await expect(kartu.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(persen));
    await expect(kartu).toContainText(`${formatRupiah(saldo)} dari ${formatRupiah(target)}`);
    await expect(kartu).toContainText(`kurang ${formatRupiah(target - saldo)}`);
    await expect(kartu).toContainText(/Perlu ±Rp [\d.]+\/bulan/);

    // Akun yang sudah dipakai tidak ditawarkan untuk tujuan baru.
    await page.goto("/tujuan/baru");
    await expect(page.getByLabel("Akun tabungan").locator("option", { hasText: akun })).toHaveCount(0);

    // Turunkan target di bawah saldo -> tercapai.
    await page.goto("/tujuan");
    await kartu.click();
    await page.getByLabel("Target").fill(String(saldo - 200_000));
    await page.getByLabel("Tenggat (opsional)").fill(addDays(t, 30));
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(page.getByText("Perubahan tersimpan.")).toBeVisible();
    await expect(kartu).toContainText("Tercapai");

    // Bersihkan: hapus tujuan dan setoran uji.
    await kartu.click();
    await page.getByRole("button", { name: "Hapus tujuan" }).click();
    await page.getByRole("button", { name: "Ya, hapus" }).click();
    await expect(page.getByText(/Tujuan dihapus/)).toBeVisible();
    await expect(kartu).toHaveCount(0);
    await hapusTransaksi(page, setoran);
    expect(await saldoAkun(page, akun)).toBe(awal);
  });
});
