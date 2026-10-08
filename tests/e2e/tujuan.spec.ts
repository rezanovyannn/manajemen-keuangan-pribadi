import { expect, test, type Page } from "@playwright/test";

import { todayInJakarta } from "../../src/lib/dates";
import { formatRupiah, parseRupiah } from "../../src/lib/money/rupiah";
import { AKUN, barisAkun, bukaMenu, catat, hapusTransaksi, masuk, saldoAkun, skipTanpaAkunUji, tagUji } from "./helpers";

// Nilai baris "Tabungan tujuan" di kartu aman dibelanjakan (halaman Insight).
async function tabunganTujuan(page: Page) {
  await page.goto("/insight");
  const baris = page
    .getByRole("region", { name: "Aman dibelanjakan" })
    .locator("div")
    .filter({ has: page.getByText("Tabungan tujuan", { exact: true }) });
  return parseRupiah(((await baris.locator("dd").textContent()) ?? "").replace("−", ""))!;
}

async function sisihkanAtauAmbil(page: Page, jenis: "Sisihkan" | "Ambil", akun: string, nominal: string) {
  await page.locator("fieldset label", { hasText: jenis }).click();
  // Label pilihan berisi saldo bebas/tabungan, contoh "Cash On Hand · bebas Rp 1.000.000".
  const pilih = page.getByLabel(jenis === "Sisihkan" ? "Dari akun" : "Kembalikan ke akun");
  const value = await pilih.locator("option", { hasText: new RegExp(`^${akun} ·`) }).getAttribute("value");
  await pilih.selectOption(value!);
  await page.getByLabel("Nominal").fill(nominal);
  await page.getByRole("button", { name: jenis, exact: true }).click();
}

test.describe("tujuan tabungan (disisihkan manual)", () => {
  skipTanpaAkunUji();

  test("sisihkan, batas saldo bebas, ambil, kartu akun, aman dibelanjakan, riwayat, hapus", async ({ page }, info) => {
    await masuk(page);
    const setoran = tagUji(info.project.name, "setoran tabungan");
    const tujuan = tagUji(info.project.name, "Liburan");
    const akun = AKUN.cash;
    const target = 10_000_000;

    // Pastikan ada saldo bebas di akun.
    const awal = await saldoAkun(page, akun);
    await catat(page, { tipe: "income", nominal: "4200000", akun, kategori: "Bonus", catatan: setoran });
    const tabunganAwal = await tabunganTujuan(page);

    // Buat tujuan (tanpa memilih akun) → langsung ke halaman tujuan.
    await bukaMenu(page, "Tujuan tabungan");
    await page.getByRole("link", { name: "Tambah", exact: true }).click();
    await page.getByLabel("Nama tujuan").fill(tujuan);
    await page.getByLabel("Target").fill(String(target));
    const [y, m, d] = todayInJakarta().split("-").map(Number) as [number, number, number];
    const bulan = m + 8;
    const tenggat = `${y + Math.floor((bulan - 1) / 12)}-${String(((bulan - 1) % 12) + 1).padStart(2, "0")}-${String(Math.min(d, 28)).padStart(2, "0")}`;
    await page.getByLabel("Tenggat (opsional)").fill(tenggat);
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Tujuan tersimpan. Sisihkan tabungan pertamamu di bawah.")).toBeVisible();
    const kartu = page.getByRole("region", { name: new RegExp(`^${tujuan}`) });
    await expect(kartu).toContainText("Belum ada tabungan");

    // Sisihkan 3jt: progress 30%, saldo akun tidak berubah.
    await sisihkanAtauAmbil(page, "Sisihkan", akun, "3000000");
    await expect(page.getByText("Tabungan disisihkan.")).toBeVisible();
    await expect(kartu.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "30");
    await expect(kartu).toContainText(`${formatRupiah(3_000_000)} dari ${formatRupiah(target)}`);
    await expect(kartu).toContainText(`Dari ${akun} ${formatRupiah(3_000_000)}`);
    await expect(kartu).toContainText(/Perlu ±Rp [\d.]+\/bulan/);

    // Melebihi saldo bebas ditolak di server.
    await sisihkanAtauAmbil(page, "Sisihkan", akun, "999999999999");
    await expect(page.getByText(/Melebihi saldo bebas di akun ini \(maks\. Rp [\d.]+\)\./)).toBeVisible();

    // Ambil 1jt kembali ke saldo bebas; melebihi tabungan ditolak.
    await sisihkanAtauAmbil(page, "Ambil", akun, "5000000");
    await expect(page.getByText(`Melebihi tabungan dari akun ini (maks. ${formatRupiah(3_000_000)}).`)).toBeVisible();
    await sisihkanAtauAmbil(page, "Ambil", akun, "1000000");
    await expect(page.getByText("Tabungan diambil kembali ke saldo bebas.")).toBeVisible();
    await expect(kartu).toContainText(`${formatRupiah(2_000_000)} dari ${formatRupiah(target)}`);

    // Kartu akun: saldo tetap, tabungan + bebas dipakai.
    const saldo = await saldoAkun(page, akun);
    expect(saldo).toBe(awal + 4_200_000);
    await expect(barisAkun(page, akun)).toContainText(`Tabungan ${tujuan}${formatRupiah(2_000_000)}`);
    await expect(barisAkun(page, akun)).toContainText(/Bebas dipakai/);

    // Aman dibelanjakan dikurangi tabungan yang disisihkan.
    expect(await tabunganTujuan(page)).toBe(tabunganAwal + 2_000_000);

    // Riwayat: setoran yang sebagian sudah diambil tidak bisa dihapus; hapus pengambilannya dulu.
    await page.goto("/tujuan");
    await page.getByRole("link", { name: new RegExp(tujuan) }).click();
    const riwayat = page.getByRole("region", { name: "Riwayat tabungan" }).getByRole("listitem");
    await expect(riwayat).toHaveCount(2);
    await riwayat.filter({ hasText: "Sisihkan dari" }).getByRole("button").click();
    await expect(page.getByText(/tidak bisa dihapus karena sebagian tabungannya sudah diambil/)).toBeVisible();
    await riwayat.filter({ hasText: "Ambil ke" }).getByRole("button").click();
    await expect(page.getByText("Riwayat dihapus.")).toBeVisible();
    await expect(kartu).toContainText(`${formatRupiah(3_000_000)} dari ${formatRupiah(target)}`);

    // Hapus tujuan → tabungan kembali bebas.
    await page.getByRole("button", { name: "Hapus tujuan" }).click();
    await page.getByRole("button", { name: "Ya, hapus" }).click();
    await expect(page.getByText("Tujuan dihapus. Tabungannya kembali menjadi saldo bebas.")).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(tujuan) })).toHaveCount(0);
    expect(await tabunganTujuan(page)).toBe(tabunganAwal);

    await hapusTransaksi(page, setoran);
    expect(await saldoAkun(page, akun)).toBe(awal);
  });
});
