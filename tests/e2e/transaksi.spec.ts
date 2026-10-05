import { expect, test } from "@playwright/test";

import { arsipkanAkun, masuk, skipTanpaAkunUji } from "./helpers";

test.describe("tambah transaksi", () => {
  skipTanpaAkunUji();
  // Test ini menulis data ke akun uji; jalankan berurutan agar tidak saling tabrak.
  test.describe.configure({ mode: "serial" });

  test("catat pengeluaran dari tombol +", async ({ page }, info) => {
    await masuk(page);

    // Pastikan ada akun khusus test ini.
    const namaAkun = `E2E ${info.project.name} ${Date.now()}`;
    await page.goto("/akun/baru");
    await page.getByLabel("Nama akun").fill(namaAkun);
    await page.getByLabel("Saldo awal").fill("100000");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText(namaAkun)).toBeVisible();

    await page.goto("/beranda");
    await page.getByRole("link", { name: "Tambah transaksi" }).click();
    await expect(page).toHaveURL(/\/transaksi\/baru$/);

    // Nominal langsung fokus dan diformat otomatis.
    const nominal = page.getByLabel("Nominal");
    await expect(nominal).toBeFocused();
    await nominal.pressSequentially("12345");
    await expect(nominal).toHaveValue("12.345");

    await page.getByLabel("Akun").selectOption({ label: namaAkun });
    await page.getByLabel("Kategori").selectOption({ label: "Makan & Minum" });
    await page.getByLabel("Catatan (opsional)").fill(`uji ${namaAkun}`);
    await page.getByRole("button", { name: "Simpan", exact: true }).click();

    await expect(page).toHaveURL(/\/transaksi\?tersimpan=1$/);
    await expect(page.getByText("Transaksi tersimpan.")).toBeVisible();

    // Bersihkan: hapus transaksi uji lalu arsipkan akunnya.
    await page.goto(`/transaksi?cari=${encodeURIComponent(`uji ${namaAkun}`)}`);
    await page.getByRole("main").getByRole("listitem").first().getByRole("link").click();
    await page.getByRole("button", { name: "Hapus transaksi" }).click();
    await page.getByRole("button", { name: "Ya, hapus" }).click();
    await expect(page.getByText("Transaksi dihapus.")).toBeVisible();
    await arsipkanAkun(page, namaAkun);
  });

  test("validasi: nominal dan kategori wajib", async ({ page }) => {
    await masuk(page);
    await page.goto("/transaksi/baru");
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(page.getByText("Nominal wajib diisi.")).toBeVisible();
    await expect(page.getByText("Pilih kategori.")).toBeVisible();
  });
});

test.describe("daftar, edit, dan hapus transaksi", () => {
  skipTanpaAkunUji();

  test("transfer tampil satu baris, filter, cari, edit, hapus", async ({ page }, info) => {
    await masuk(page);
    const tag = `${info.project.name} ${Date.now()}`;
    const asal = `E2E Asal ${tag}`;
    const tujuan = `E2E Tujuan ${tag}`;

    for (const nama of [asal, tujuan]) {
      await page.goto("/akun/baru");
      await page.getByLabel("Nama akun").fill(nama);
      await page.getByLabel("Saldo awal").fill("500000");
      await page.getByRole("button", { name: "Simpan" }).click();
      await expect(page).toHaveURL(/\/akun$/);
    }

    // Pengeluaran dengan catatan unik.
    const catatan = `kopi ${tag}`;
    await page.goto("/transaksi/baru");
    await page.getByLabel("Nominal").fill("25000");
    await page.getByLabel("Akun").selectOption({ label: asal });
    await page.getByLabel("Kategori").selectOption({ label: "Makan & Minum" });
    await page.getByLabel("Catatan (opsional)").fill(catatan);
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(page).toHaveURL(/tersimpan=1/);

    // Transfer.
    await page.goto("/transaksi/baru?tipe=transfer");
    await page.getByLabel("Nominal").fill("100000");
    await page.getByLabel("Dari akun").selectOption({ label: asal });
    await page.getByLabel("Ke akun").selectOption({ label: tujuan });
    await page.getByLabel("Catatan (opsional)").fill(`transfer ${tag}`);
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(page).toHaveURL(/tersimpan=1/);

    // Filter akun tujuan: hanya transfer yang tampil, sebagai satu baris.
    await page.getByText(/^Filter & cari/).click();
    await page.getByLabel("Filter akun").selectOption({ label: tujuan });
    await page.getByRole("button", { name: "Terapkan" }).click();
    const daftar = page.getByRole("main").getByRole("listitem");
    await expect(daftar).toHaveCount(1);
    await expect(daftar.first()).toContainText(asal);
    await expect(daftar.first()).toContainText(tujuan);
    await expect(daftar.first()).toContainText("Rp 100.000");

    // Cari catatan pengeluaran.
    await page.goto(`/transaksi?cari=${encodeURIComponent(catatan)}`);
    await expect(daftar).toHaveCount(1);
    await expect(daftar.first()).toContainText("−Rp 25.000");

    // Edit nominal.
    await daftar.first().getByRole("link").click();
    await expect(page.getByRole("heading", { name: "Ubah transaksi" })).toBeVisible();
    await page.getByLabel("Nominal").fill("30000");
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(page.getByText("Perubahan tersimpan.")).toBeVisible();

    await page.goto(`/transaksi?cari=${encodeURIComponent(catatan)}`);
    await expect(daftar.first()).toContainText("−Rp 30.000");

    // Hapus (dengan konfirmasi).
    await daftar.first().getByRole("link").click();
    await page.getByRole("button", { name: "Hapus transaksi" }).click();
    await page.getByRole("button", { name: "Ya, hapus" }).click();
    await expect(page.getByText("Transaksi dihapus.")).toBeVisible();
    await page.goto(`/transaksi?cari=${encodeURIComponent(catatan)}`);
    await expect(page.getByText("Belum ada transaksi di periode ini.")).toBeVisible();

    // Bersihkan: hapus transfer uji lalu arsipkan kedua akun.
    await page.goto(`/transaksi?cari=${encodeURIComponent(`transfer ${tag}`)}`);
    await daftar.first().getByRole("link").click();
    await page.getByRole("button", { name: "Hapus transaksi" }).click();
    await page.getByRole("button", { name: "Ya, hapus" }).click();
    await expect(page.getByText("Transaksi dihapus.")).toBeVisible();
    await arsipkanAkun(page, asal);
    await arsipkanAkun(page, tujuan);
  });
});
