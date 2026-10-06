import { expect, test } from "@playwright/test";

import { AKUN, catat, cariTransaksi, hapusTransaksi, masuk, saldoAkun, skipTanpaAkunUji, tagUji } from "./helpers";

test.describe("transaksi", () => {
  skipTanpaAkunUji();

  test("catat pengeluaran dari tombol +", async ({ page }, info) => {
    await masuk(page);
    const catatan = tagUji(info.project.name, "kopi");

    await page.getByRole("link", { name: "Tambah transaksi" }).click();
    await expect(page).toHaveURL(/\/transaksi\/baru$/);

    // Nominal langsung fokus dan diformat otomatis.
    const nominal = page.getByLabel("Nominal");
    await expect(nominal).toBeFocused();
    await nominal.pressSequentially("12345");
    await expect(nominal).toHaveValue("12.345");

    await page.getByLabel("Akun").selectOption({ label: AKUN.cash });
    await page.getByLabel("Kategori").selectOption({ label: "Makan & Minum" });
    await page.getByLabel("Catatan (opsional)").fill(catatan);
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(page).toHaveURL(/\/transaksi\?tersimpan=1$/);
    await expect(page.getByText("Transaksi tersimpan.")).toBeVisible();

    await hapusTransaksi(page, catatan);
  });

  test("validasi: nominal dan kategori wajib", async ({ page }) => {
    await masuk(page);
    await page.goto("/transaksi/baru");
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(page.getByText("Nominal wajib diisi.")).toBeVisible();
    await expect(page.getByText("Pilih kategori.")).toBeVisible();
  });

  test("transfer tampil satu baris, filter, cari, edit, hapus", async ({ page }, info) => {
    await masuk(page);
    const kopi = tagUji(info.project.name, "kopi");
    const tarik = tagUji(info.project.name, "tarik");

    await catat(page, { tipe: "expense", nominal: "25000", akun: AKUN.bri, kategori: "Makan & Minum", catatan: kopi });
    await catat(page, { tipe: "transfer", nominal: "100000", akun: AKUN.bri, ke: AKUN.gopay, catatan: tarik });

    // Filter akun tujuan (GoPay) + cari: transfer tampil sebagai satu baris BRI → GoPay.
    let daftar = await cariTransaksi(page, tarik);
    // Panel filter sudah terbuka otomatis saat pencarian aktif; buka hanya jika tertutup.
    const panel = page.locator("details").filter({ hasText: "Filter & cari" });
    if ((await panel.getAttribute("open")) === null) await page.getByText(/^Filter & cari/).click();
    await page.getByLabel("Filter akun").selectOption({ label: AKUN.gopay });
    await page.getByRole("button", { name: "Terapkan" }).click();
    await expect(daftar).toHaveCount(1);
    await expect(daftar.first()).toContainText(AKUN.bri);
    await expect(daftar.first()).toContainText(AKUN.gopay);
    await expect(daftar.first()).toContainText("Rp 100.000");

    // Cari pengeluaran lalu edit nominal.
    daftar = await cariTransaksi(page, kopi);
    await expect(daftar).toHaveCount(1);
    await expect(daftar.first()).toContainText("−Rp 25.000");
    await daftar.first().getByRole("link").click();
    await page.getByLabel("Nominal").fill("30000");
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(page.getByText("Perubahan tersimpan.")).toBeVisible();
    daftar = await cariTransaksi(page, kopi);
    await expect(daftar.first()).toContainText("−Rp 30.000");

    // Hapus (dengan konfirmasi).
    await hapusTransaksi(page, kopi);
    await expect(page.getByText("Belum ada transaksi di periode ini.")).toBeVisible();
    await hapusTransaksi(page, tarik);
  });

  test("biaya admin: pengeluaran & transfer, saldo, ubah, hapus", async ({ page }, info) => {
    await masuk(page);
    const belanja = tagUji(info.project.name, "belanja admin");
    const kirim = tagUji(info.project.name, "kirim admin");
    const awal = { bri: await saldoAkun(page, AKUN.bri), gopay: await saldoAkun(page, AKUN.gopay), mandiri: await saldoAkun(page, AKUN.mandiri) };

    // Pengeluaran Rp 50.000 + admin Rp 2.500 dari Mandiri.
    await catat(page, { tipe: "expense", nominal: "50000", akun: AKUN.mandiri, kategori: "Belanja", biaya: "2500", catatan: belanja });
    let daftar = await cariTransaksi(page, belanja);
    await expect(daftar).toHaveCount(1); // biaya menempel, bukan baris terpisah
    await expect(daftar.first()).toContainText("admin Rp 2.500");

    // Transfer BRI → GoPay Rp 100.000 + admin Rp 6.500 (dari akun asal).
    await catat(page, { tipe: "transfer", nominal: "100000", akun: AKUN.bri, ke: AKUN.gopay, biaya: "6500", catatan: kirim });
    expect(await saldoAkun(page, AKUN.mandiri)).toBe(awal.mandiri - 52_500);
    expect(await saldoAkun(page, AKUN.bri)).toBe(awal.bri - 106_500);
    expect(await saldoAkun(page, AKUN.gopay)).toBe(awal.gopay + 100_000);

    // Ubah biaya transfer jadi Rp 4.000.
    daftar = await cariTransaksi(page, kirim);
    await daftar.first().getByRole("link").click();
    await expect(page.getByLabel("Biaya admin (opsional)")).toHaveValue("6.500");
    await page.getByLabel("Biaya admin (opsional)").fill("4000");
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(page.getByText("Perubahan tersimpan.")).toBeVisible();
    expect(await saldoAkun(page, AKUN.bri)).toBe(awal.bri - 104_000);

    // Hapus biaya pengeluaran (kosongkan kolom).
    daftar = await cariTransaksi(page, belanja);
    await daftar.first().getByRole("link").click();
    await page.getByLabel("Biaya admin (opsional)").fill("");
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(page.getByText("Perubahan tersimpan.")).toBeVisible();
    expect(await saldoAkun(page, AKUN.mandiri)).toBe(awal.mandiri - 50_000);

    // Hapus transaksi: biayanya ikut terhapus, saldo kembali seperti awal.
    await hapusTransaksi(page, belanja);
    await hapusTransaksi(page, kirim);
    expect(await saldoAkun(page, AKUN.bri)).toBe(awal.bri);
    expect(await saldoAkun(page, AKUN.gopay)).toBe(awal.gopay);
    expect(await saldoAkun(page, AKUN.mandiri)).toBe(awal.mandiri);
  });
});
