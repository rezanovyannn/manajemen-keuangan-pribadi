import { expect, test, type Page } from "@playwright/test";

import { arsipkanAkun, masuk, skipTanpaAkunUji } from "./helpers";

// Setiap test memakai sub-kategori & akun unik agar desktop/HP yang paralel tidak bentrok.
async function siapkan(page: Page, tag: string) {
  const sub = `E2E Budget ${tag}`;
  const akun = `E2E Budget Akun ${tag}`;
  await page.goto("/kategori/baru?tipe=pengeluaran");
  await page.getByLabel("Nama kategori").fill(sub);
  await page.getByLabel("Masuk ke dalam").selectOption({ label: "Hiburan" });
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(page).toHaveURL(/\/kategori\?tipe=pengeluaran$/);

  await page.goto("/akun/baru");
  await page.getByLabel("Nama akun").fill(akun);
  await page.getByLabel("Saldo awal").fill("1000000");
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(page).toHaveURL(/\/akun$/);
  return { sub, label: `Hiburan › ${sub}`, akun };
}

async function belanja(page: Page, akun: string, kategori: string, nominal: string, catatan: string) {
  await page.goto("/transaksi/baru");
  await page.getByLabel("Nominal").fill(nominal);
  await page.getByLabel("Akun").selectOption({ label: akun });
  await page.getByLabel("Kategori").selectOption({ label: kategori });
  await page.getByLabel("Catatan (opsional)").fill(catatan);
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page).toHaveURL(/tersimpan=1/);
}

async function bersihkan(page: Page, s: { sub: string; akun: string }, catatan: string[]) {
  for (const c of catatan) {
    await page.goto(`/transaksi?cari=${encodeURIComponent(c)}`);
    await page.getByRole("main").getByRole("listitem").first().getByRole("link").click();
    await page.getByRole("button", { name: "Hapus transaksi" }).click();
    await page.getByRole("button", { name: "Ya, hapus" }).click();
    await expect(page.getByText("Transaksi dihapus.")).toBeVisible();
  }
  await arsipkanAkun(page, s.akun);
  await page.goto("/kategori?tipe=pengeluaran");
  await page.getByRole("link", { name: s.sub }).click();
  await page.getByRole("button", { name: "Arsipkan kategori" }).click();
  await expect(page.getByRole("link", { name: s.sub })).toHaveCount(0);
}

const kartu = (page: Page, label: string) => page.getByRole("link").filter({ hasText: label });

test.describe("budget", () => {
  skipTanpaAkunUji();

  test("pemakaian dari transaksi, peringatan 80%, terlampaui, ubah, hapus", async ({ page }, info) => {
    await masuk(page);
    const tag = `${info.project.name} ${Date.now()}`;
    const s = await siapkan(page, tag);

    await page.goto("/budget");
    await page.getByRole("link", { name: "Tambah" }).click();
    await page.getByLabel("Kategori pengeluaran").selectOption({ label: s.label });
    await page.getByLabel("Batas per bulan").fill("100000");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Budget tersimpan.")).toBeVisible();
    await expect(kartu(page, s.sub)).toContainText("Aman");
    await expect(kartu(page, s.sub)).toContainText("Sisa Rp 100.000");

    // 85% -> hampir habis.
    await belanja(page, s.akun, s.label, "85000", `b1 ${tag}`);
    await page.goto("/budget");
    await expect(kartu(page, s.sub)).toContainText("Hampir habis");
    await expect(kartu(page, s.sub).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "85");

    // 105% -> terlampaui, dan Beranda menampilkan peringatan.
    await belanja(page, s.akun, s.label, "20000", `b2 ${tag}`);
    await page.goto("/budget");
    await expect(kartu(page, s.sub)).toContainText("Terlampaui");
    await expect(kartu(page, s.sub)).toContainText("Lewat Rp 5.000");
    await page.goto("/beranda");
    await expect(page.getByRole("region", { name: "Peringatan budget" })).toContainText("terlampaui");

    // Ubah batas -> aman lagi.
    await page.goto("/budget");
    await kartu(page, s.sub).click();
    await page.getByLabel("Batas per bulan").fill("200000");
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(page.getByText("Perubahan tersimpan.")).toBeVisible();
    await expect(kartu(page, s.sub)).toContainText("Aman");
    await expect(kartu(page, s.sub)).toContainText("Sisa Rp 95.000");

    // Hapus budget.
    await kartu(page, s.sub).click();
    await page.getByRole("button", { name: "Hapus budget" }).click();
    await page.getByRole("button", { name: "Ya, hapus" }).click();
    await expect(page.getByText("Budget dihapus.")).toBeVisible();
    await expect(kartu(page, s.sub)).toHaveCount(0);

    await bersihkan(page, s, [`b1 ${tag}`, `b2 ${tag}`]);
  });

  test("salin budget dari bulan lalu", async ({ page }, info) => {
    await masuk(page);
    const tag = `${info.project.name} salin ${Date.now()}`;
    const s = await siapkan(page, tag);

    // Buat budget di bulan lalu.
    await page.goto("/budget");
    await page.getByRole("link", { name: "Bulan sebelumnya" }).click();
    const bulanLalu = new URL(page.url()).searchParams.get("bulan")!;
    await page.getByRole("link", { name: "Tambah" }).click();
    await page.getByLabel("Kategori pengeluaran").selectOption({ label: s.label });
    await page.getByLabel("Batas per bulan").fill("75000");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Budget tersimpan.")).toBeVisible();

    // Bulan ini: salin.
    await page.getByRole("link", { name: "Bulan berikutnya" }).click();
    await page.getByRole("button", { name: /^Salin \d+ budget dari bulan lalu$/ }).click();
    await expect(page.getByText("Budget bulan lalu sudah disalin.")).toBeVisible();
    await expect(kartu(page, s.sub)).toContainText("dari Rp 75.000");

    // Bersihkan kedua budget.
    for (const url of [page.url(), `/budget?bulan=${bulanLalu}`]) {
      await page.goto(url);
      await kartu(page, s.sub).click();
      await page.getByRole("button", { name: "Hapus budget" }).click();
      await page.getByRole("button", { name: "Ya, hapus" }).click();
      await expect(page.getByText("Budget dihapus.")).toBeVisible();
    }
    await bersihkan(page, s, []);
  });
});
