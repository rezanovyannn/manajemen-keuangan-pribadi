import { expect, test } from "@playwright/test";

import { AKUN, bukaMenu, hapusTransaksi, masuk, saldoAkun, skipTanpaAkunUji } from "./helpers";

test.describe("utang & piutang", () => {
  skipTanpaAkunUji();

  test("bayar utang mengurangi sisa sampai lunas, terima piutang, tidak bisa dihapus jika ada pembayaran", async ({ page }, info) => {
    // Alur panjang: 3x bayar + terima + pembersihan.
    test.setTimeout(180_000);
    await masuk(page);
    const tag = `${info.project.name} ${Date.now()}`;
    const akun = AKUN.bri;
    const utang = `E2E Paylater ${tag}`;
    const piutang = `E2E Pinjam Budi ${tag}`;
    const awal = await saldoAkun(page, akun);

    // Utang Rp 600.000, cicilan Rp 250.000.
    await bukaMenu(page, "Utang & piutang");
    await page.getByRole("link", { name: "Tambah", exact: true }).click();
    await page.getByLabel("Nama", { exact: true }).fill(utang);
    await page.getByLabel("Jumlah utang").fill("600000");
    await page.getByLabel("Cicilan per bulan (opsional)").fill("250000");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Tersimpan.")).toBeVisible();
    await page.getByRole("link", { name: new RegExp(utang) }).click();

    // Bayar 2x cicilan, lalu sisa (form terisi otomatis: cicilan, lalu sisa yang lebih kecil).
    for (const harapan of ["250.000", "250.000", "100.000"]) {
      await page.getByRole("link", { name: "Bayar cicilan" }).click();
      await expect(page.getByLabel("Nominal")).toHaveValue(harapan);
      await expect(page.getByLabel("Kategori")).toHaveValue(/.+/);
      await page.getByLabel("Akun").selectOption({ label: akun });
      await page.getByRole("button", { name: "Simpan", exact: true }).click();
      await expect(page.getByText("Pembayaran tercatat.")).toBeVisible();
    }
    await expect(page.getByRole("main")).toContainText("Lunas");
    await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(3);
    await expect(page.getByRole("link", { name: "Bayar cicilan" })).toHaveCount(0);
    // Ada pembayaran -> tidak bisa dihapus, hanya diarsipkan.
    await expect(page.getByRole("button", { name: "Hapus" })).toHaveCount(0);

    // Piutang Rp 300.000, diterima Rp 100.000.
    await page.goto("/utang/baru?jenis=piutang");
    await page.getByLabel("Nama", { exact: true }).fill(piutang);
    await page.getByLabel("Jumlah dipinjamkan").fill("300000");
    await page.getByRole("button", { name: "Simpan" }).click();
    await page.getByRole("link", { name: new RegExp(piutang) }).click();
    await page.getByRole("link", { name: "Terima pembayaran" }).click();
    await page.getByLabel("Nominal").fill("100000");
    await page.getByLabel("Akun").selectOption({ label: akun });
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(page.getByText("Pembayaran tercatat.")).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(`${piutang}, sisa Rp 200.000`) })).toBeVisible();

    // Saldo akun ikut berubah: -600.000 (bayar utang) + 100.000 (terima piutang).
    expect(await saldoAkun(page, akun)).toBe(awal - 500_000);

    // Bersihkan: hapus transaksi uji (catatan memuat tag), lalu hapus utang/piutang.
    await hapusTransaksi(page, tag);
    expect(await saldoAkun(page, akun)).toBe(awal);
    for (const [nama, jenis] of [[utang, "utang"], [piutang, "piutang"]] as const) {
      await page.goto(`/utang?jenis=${jenis}`);
      // Item lunas ada di bagian terlipat; buka hanya jika bagian itu ada.
      const terlipat = page.getByText(/^Lunas \/ diarsipkan/);
      if (await terlipat.isVisible()) await terlipat.click();
      await page.getByRole("link", { name: new RegExp(nama) }).first().click();
      await page.getByRole("button", { name: "Hapus" }).click();
      await page.getByRole("button", { name: "Ya, hapus" }).click();
      await expect(page.getByText("Dihapus.")).toBeVisible();
    }
  });
});
