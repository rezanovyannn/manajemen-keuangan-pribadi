import { expect, test, type Page } from "@playwright/test";

import { addDays, todayInJakarta } from "../../src/lib/dates";
import { AKUN, hapusTransaksi, masuk, skipTanpaAkunUji } from "./helpers";

async function buatJadwal(page: Page, j: { nama: string; akun: string; nominal: string; frekuensi: string; mulai: string }) {
  await page.goto("/berulang/baru");
  await page.getByLabel("Nama").fill(j.nama);
  await page.getByLabel("Nominal perkiraan").fill(j.nominal);
  await page.getByLabel("Akun").selectOption({ label: j.akun });
  await page.getByLabel("Kategori").selectOption({ label: "Tagihan" });
  await page.getByLabel("Ulangi").selectOption({ label: j.frekuensi });
  await page.getByLabel("Mulai (jatuh tempo pertama)").fill(j.mulai);
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByText("Jadwal tersimpan.")).toBeVisible();
}

const kartuSaran = (page: Page, nama: string) =>
  page.getByRole("region", { name: "Perlu dicatat" }).getByRole("listitem").filter({ hasText: nama });

async function hapusJadwal(page: Page, nama: string) {
  await page.goto("/berulang");
  await page.getByRole("link", { name: new RegExp(nama) }).click();
  await page.getByRole("button", { name: "Hapus jadwal" }).click();
  await page.getByRole("button", { name: "Ya, hapus" }).click();
  await expect(page.getByText("Jadwal dihapus.")).toBeVisible();
}

test.describe("transaksi berulang (saran, tanpa auto-catat)", () => {
  skipTanpaAkunUji();

  test("saran muncul, Catat dengan form terisi, tidak bisa dicatat ganda, Lewati satu per satu", async ({ page }, info) => {
    await masuk(page);
    const today = todayInJakarta();
    const tag = `${info.project.name} ${Date.now()}`;
    const akun = AKUN.gopay;
    const tagihan = `E2E Netflix ${tag}`;
    const mingguan = `E2E Laundry ${tag}`;

    // Jadwal bulanan jatuh tempo hari ini.
    await buatJadwal(page, { nama: tagihan, akun, nominal: "186000", frekuensi: "Bulanan", mulai: today });
    // Tidak ada transaksi yang tercatat otomatis.
    await page.goto(`/transaksi?cari=${encodeURIComponent(tagihan)}`);
    await expect(page.getByText("Belum ada transaksi di periode ini.")).toBeVisible();

    await page.goto("/beranda");
    const kartu = kartuSaran(page, tagihan);
    await expect(kartu).toContainText("Rp 186.000");
    await expect(kartu).toContainText("jatuh tempo hari ini");

    // Catat: form terisi dari jadwal; nominal diubah sebelum disimpan.
    const urlCatat = await kartu.getByRole("link", { name: `Catat ${tagihan}` }).getAttribute("href");
    await kartu.getByRole("link", { name: `Catat ${tagihan}` }).click();
    await expect(page.getByRole("heading", { name: "Catat dari jadwal" })).toBeVisible();
    await expect(page.getByLabel("Nominal")).toHaveValue("186.000");
    await expect(page.getByLabel("Tanggal")).toHaveValue(today);
    await page.getByLabel("Nominal").fill("190000");
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(page.getByText("Transaksi dari jadwal tercatat.")).toBeVisible();
    await expect(kartuSaran(page, tagihan)).toHaveCount(0); // maju ke bulan depan

    // Catat ganda lewat URL yang sama ditolak (tidak membuat transaksi kedua).
    await page.goto(urlCatat!);
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(page.getByText("Jadwal ini sudah pernah dicatat, tidak dibuat ganda.")).toBeVisible();
    await page.goto(`/transaksi?cari=${encodeURIComponent(tagihan)}`);
    const daftar = page.getByRole("main").getByRole("listitem");
    await expect(daftar).toHaveCount(1);
    await expect(daftar.first()).toContainText("−Rp 190.000");

    // Jadwal mingguan yang sudah terlewat 2 kali: muncul satu per satu.
    await buatJadwal(page, { nama: mingguan, akun, nominal: "25000", frekuensi: "Mingguan", mulai: addDays(today, -14) });
    await page.goto("/beranda");
    await expect(kartuSaran(page, mingguan)).toContainText("terlambat 14 hari");
    await kartuSaran(page, mingguan).getByRole("button", { name: `Lewati ${mingguan}` }).click();
    await expect(page.getByText("Jadwal dilewati untuk tanggal ini.")).toBeVisible();
    await expect(kartuSaran(page, mingguan)).toContainText("terlambat 7 hari");
    await kartuSaran(page, mingguan).getByRole("button", { name: `Lewati ${mingguan}` }).click();
    await expect(kartuSaran(page, mingguan)).toContainText("jatuh tempo hari ini");

    // Jeda: saran hilang.
    await page.goto("/berulang");
    await page.getByRole("link", { name: new RegExp(mingguan) }).click();
    await page.getByRole("button", { name: "Jeda jadwal" }).click();
    await expect(page.getByText(/Jadwal dijeda/)).toBeVisible();
    await page.goto("/beranda");
    await expect(kartuSaran(page, mingguan)).toHaveCount(0);

    // Bersihkan.
    await hapusJadwal(page, tagihan);
    await hapusJadwal(page, mingguan);
    await hapusTransaksi(page, tagihan);
  });
});
