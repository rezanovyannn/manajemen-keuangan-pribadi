import { expect, test, type Page } from "@playwright/test";

import { currentMonthInJakarta, formatTanggal, shiftMonth, todayInJakarta } from "../../src/lib/dates";
import { AKUN, catat, hapusTransaksi, masuk, skipTanpaAkunUji } from "./helpers";

// Setiap test memakai sub-kategori unik (budget per kategori per bulan) dan akun tetap Cash On Hand.
async function siapkan(page: Page, tag: string) {
  const sub = `E2E Budget ${tag}`;
  await page.goto("/kategori/baru?tipe=pengeluaran");
  await page.getByLabel("Nama kategori").fill(sub);
  await page.getByLabel("Masuk ke dalam").selectOption({ label: "Hiburan" });
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(page).toHaveURL(/\/kategori\?tipe=pengeluaran$/);
  return { sub, label: `Hiburan › ${sub}`, akun: AKUN.cash };
}

async function belanja(page: Page, akun: string, kategori: string, nominal: string, catatan: string) {
  await catat(page, { tipe: "expense", nominal, akun, kategori, catatan });
}

async function bersihkan(page: Page, s: { sub: string }, catatan: string[]) {
  for (const c of catatan) await hapusTransaksi(page, c);
  await page.goto("/kategori?tipe=pengeluaran");
  await page.getByRole("link", { name: s.sub }).click();
  await page.getByRole("button", { name: "Arsipkan kategori" }).click();
  await expect(page.getByRole("link", { name: s.sub })).toHaveCount(0);
}

// Cocokkan judul kartu saja: rincian tersembunyi kartu induk (misal "Hiburan") juga memuat nama sub-kategori.
const kartu = (page: Page, label: string) =>
  page.getByTestId("budget-card").filter({ has: page.locator("summary p").first().filter({ hasText: label }) });

// Buka panel kartu (klik ringkasan) lalu ke halaman ubah budget.
async function bukaUbah(page: Page, label: string) {
  await kartu(page, label).locator("summary").click();
  await kartu(page, label).getByRole("link", { name: "Ubah budget" }).click();
}

test.describe("budget", () => {
  skipTanpaAkunUji();

  test("pemakaian dari transaksi, peringatan 80%, terlampaui, ubah, hapus", async ({ page }, info) => {
    await masuk(page);
    const tag = `${info.project.name} ${Date.now()}`;
    const s = await siapkan(page, tag);

    await page.goto("/budget");
    await page.getByRole("link", { name: "Tambah", exact: true }).click();
    await page.getByLabel("Kategori pengeluaran").selectOption({ label: s.label });
    await page.getByLabel("Batas per bulan").fill("100000");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Budget tersimpan.")).toBeVisible();
    await expect(kartu(page, s.sub)).toContainText("Aman");
    await expect(kartu(page, s.sub)).toContainText("Sisa Rp 100.000");

    // 85% -> hampir habis.
    await belanja(page, s.akun, s.label, "85000", `E2E b1 ${tag}`);
    await page.goto("/budget");
    await expect(kartu(page, s.sub)).toContainText("Hampir habis");
    await expect(kartu(page, s.sub).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "85");

    // 105% -> terlampaui, dan Beranda menampilkan peringatan.
    await belanja(page, s.akun, s.label, "20000", `E2E b2 ${tag}`);
    await page.goto("/budget");
    await expect(kartu(page, s.sub)).toContainText("Terlampaui");
    await expect(kartu(page, s.sub)).toContainText("Lewat Rp 5.000");
    // Laporan kapan terlampaui terlihat tanpa membuka kartu.
    await expect(kartu(page, s.sub)).toContainText(`Terlampaui sejak ${formatTanggal(todayInJakarta())}`);
    // Rincian tersembunyi sampai kartu diketuk.
    const rincian = kartu(page, s.sub).getByRole("table");
    await expect(rincian).toBeHidden();
    await kartu(page, s.sub).locator("summary").click();
    await expect(rincian).toBeVisible();
    const baris = rincian.locator("tbody tr");
    await expect(baris).toHaveCount(2);
    await expect(baris.nth(0)).toContainText(`E2E b1 ${tag}`);
    await expect(baris.nth(0)).toContainText("Mulai hampir habis");
    await expect(baris.nth(0)).toContainText("Rp 85.000");
    await expect(baris.nth(1)).toContainText("Mulai terlampaui");
    await expect(baris.nth(1)).toContainText("Rp 105.000"); // total berjalan
    await kartu(page, s.sub).locator("summary").click();
    await expect(rincian).toBeHidden();

    await page.goto("/beranda");
    await expect(page.getByRole("region", { name: "Peringatan budget" })).toContainText("terlampaui");

    // Ubah batas -> aman lagi.
    await page.goto("/budget");
    await bukaUbah(page, s.sub);
    await page.getByLabel("Batas per bulan").fill("200000");
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(page.getByText("Perubahan tersimpan.")).toBeVisible();
    await expect(kartu(page, s.sub)).toContainText("Aman");
    await expect(kartu(page, s.sub)).toContainText("Sisa Rp 95.000");

    // Hapus budget.
    await bukaUbah(page, s.sub);
    await page.getByRole("button", { name: "Hapus budget" }).click();
    await page.getByRole("button", { name: "Ya, hapus" }).click();
    await expect(page.getByText("Budget dihapus.")).toBeVisible();
    await expect(kartu(page, s.sub)).toHaveCount(0);

    await bersihkan(page, s, [`E2E b1 ${tag}`, `E2E b2 ${tag}`]);
  });

  test("salin budget dari bulan lalu", async ({ page }, info) => {
    await masuk(page);
    const tag = `${info.project.name} salin ${Date.now()}`;
    const s = await siapkan(page, tag);

    // Bulan ditentukan lewat URL (bukan klik navigasi) agar tidak salah bulan saat halaman
    // belum selesai berpindah, yang bisa menyalin budget ke bulan yang salah.
    const bulanIni = currentMonthInJakarta();
    const bulanLalu = shiftMonth(bulanIni, -1);

    // Buat budget di bulan lalu.
    await page.goto(`/budget/baru?bulan=${bulanLalu}`);
    await page.getByLabel("Kategori pengeluaran").selectOption({ label: s.label });
    await page.getByLabel("Batas per bulan").fill("75000");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Budget tersimpan.")).toBeVisible();

    // Bulan ini: salin.
    await page.goto(`/budget?bulan=${bulanIni}`);
    await page.getByRole("button", { name: /^Salin \d+ budget dari bulan lalu$/ }).click();
    await expect(page.getByText("Budget bulan lalu sudah disalin.")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`bulan=${bulanIni}`));
    await expect(kartu(page, s.sub)).toContainText("dari Rp 75.000");

    // Bersihkan kedua budget.
    for (const url of [`/budget?bulan=${bulanIni}`, `/budget?bulan=${bulanLalu}`]) {
      await page.goto(url);
      await bukaUbah(page, s.sub);
      await page.getByRole("button", { name: "Hapus budget" }).click();
      await page.getByRole("button", { name: "Ya, hapus" }).click();
      await expect(page.getByText("Budget dihapus.")).toBeVisible();
    }
    await bersihkan(page, s, []);
  });
});
