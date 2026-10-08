import { expect, test } from "@playwright/test";

import { masuk, skipTanpaAkunUji } from "./helpers";

test.describe("navigasi bawah (HP)", () => {
  skipTanpaAkunUji();

  test("tab utama, tombol tambah, panel Lainnya; desktop memakai sidebar", async ({ page, isMobile }) => {
    await masuk(page);
    const bawah = page.getByRole("navigation", { name: "Navigasi bawah" });
    if (!isMobile) {
      await expect(bawah).toBeHidden();
      await expect(page.getByRole("navigation", { name: "Navigasi utama" })).toBeVisible();
      return;
    }

    await expect(bawah.getByRole("link", { name: "Beranda", exact: true })).toHaveAttribute("aria-current", "page");
    await bawah.getByRole("link", { name: "Transaksi", exact: true }).click();
    await expect(page).toHaveURL(/\/transaksi$/);
    await expect(bawah.getByRole("link", { name: "Transaksi", exact: true })).toHaveAttribute("aria-current", "page");

    // Menu laci lama sudah tidak ada.
    await expect(page.getByRole("button", { name: "Buka menu" })).toHaveCount(0);

    // Lainnya: grid menu; tertutup setelah memilih; tab Lainnya aktif di halaman tersebut.
    await bawah.getByRole("button", { name: "Lainnya" }).click();
    const menu = page.getByRole("navigation", { name: "Menu lainnya" });
    for (const label of ["Akun", "Insight & proyeksi", "Tujuan tabungan", "Profil"]) {
      await expect(menu.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
    await menu.getByRole("link", { name: "Akun", exact: true }).click();
    await expect(page).toHaveURL(/\/akun$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(bawah.getByRole("button", { name: "Lainnya" })).toHaveAttribute("aria-current", "page");

    // Tombol tambah di tengah.
    await bawah.getByRole("link", { name: "Tambah transaksi" }).click();
    await expect(page).toHaveURL(/\/transaksi\/baru$/);

    // Konten terakhir tidak tertutup bar bawah.
    await page.goto("/beranda");
    const bar = await bawah.boundingBox();
    const main = page.getByRole("main");
    await main.evaluate((el) => window.scrollTo(0, el.scrollHeight));
    const akhir = await main.locator("section").last().boundingBox();
    expect(akhir!.y + akhir!.height).toBeLessThanOrEqual(bar!.y + 1);
  });
});
