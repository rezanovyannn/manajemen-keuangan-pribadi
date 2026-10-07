import { expect, test } from "@playwright/test";

import { KUNCI_ANTREAN } from "../../src/lib/offline/queue";
import { AKUN, cariTransaksi, hapusTransaksi, masuk, skipTanpaAkunUji, tagUji } from "./helpers";

test.describe("catat offline", () => {
  skipTanpaAkunUji();

  test("tanpa sinyal: simpan di HP, terkirim saat online, tidak dobel saat dikirim ulang", async ({ page, context }, info) => {
    await masuk(page);
    const catatan = tagUji(info.project.name, "offline");

    // Online: buka form agar daftar akun/kategori tersimpan di HP & service worker aktif.
    await page.goto("/transaksi/baru");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

    // Offline: halaman tambah transaksi diganti form offline dari cache.
    await context.setOffline(true);
    await page.goto("/transaksi/baru");
    await expect(page.getByRole("heading", { name: "Catat offline" })).toBeVisible();
    await page.getByLabel("Nominal").fill("12345");
    await page.getByLabel("Akun").selectOption({ label: AKUN.cash });
    await page.getByLabel("Kategori").selectOption({ label: "Makan & Minum" });
    await page.getByLabel("Catatan (opsional)").fill(catatan);
    await page.getByRole("button", { name: "Simpan offline" }).click();
    await expect(page.getByText("Tersimpan di HP. Akan dikirim otomatis saat online.")).toBeVisible();
    await expect(page.getByRole("region", { name: "Transaksi offline" })).toContainText("1 transaksi offline menunggu dikirim");
    const antrean = await page.evaluate((k) => localStorage.getItem(k), KUNCI_ANTREAN);
    expect(antrean).toContain(catatan);

    // Kembali online: terkirim otomatis.
    await context.setOffline(false);
    await expect(page.getByText("1 transaksi offline sudah terkirim.")).toBeVisible();
    expect(await page.evaluate((k) => localStorage.getItem(k), KUNCI_ANTREAN)).toBeNull();
    let daftar = await cariTransaksi(page, catatan);
    await expect(daftar).toHaveCount(1);
    await expect(daftar.first()).toContainText("−Rp 12.345");

    // Kirim ulang item yang sama (misal sinyal putus tepat setelah server menyimpan): tetap satu.
    await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [KUNCI_ANTREAN, antrean]);
    await page.goto("/beranda");
    await expect(page.getByText("1 transaksi offline sudah terkirim.")).toBeVisible();
    daftar = await cariTransaksi(page, catatan);
    await expect(daftar).toHaveCount(1);

    await hapusTransaksi(page, catatan);
  });
});
