import { expect, test, type Page } from "@playwright/test";

import { todayInJakarta } from "../../src/lib/dates";
import { parseRupiah } from "../../src/lib/money";
import { AKUN, masuk, skipTanpaAkunUji } from "./helpers";

const BESAR = 999_999_999;

async function nominal(page: Page, testId: string) {
  const teks = (await page.getByTestId(testId).textContent()) ?? "";
  const n = parseRupiah(teks.replace("−", "-"));
  expect(n, `nominal ${testId}: ${teks}`).not.toBeNull();
  return n!;
}

const baris = (page: Page, label: string) =>
  page.getByRole("region", { name: "Aman dibelanjakan" }).locator("div").filter({ has: page.getByText(label, { exact: true }) });

async function tagihanTerjadwal(page: Page) {
  const teks = (await baris(page, "Tagihan terjadwal").locator("dd").textContent()) ?? "";
  return parseRupiah(teks.replace("−", ""))!;
}

test.describe("insight & proyeksi", () => {
  skipTanpaAkunUji();

  test("jadwal tagihan mengurangi proyeksi, memicu peringatan saldo minus, dan muncul di Beranda", async ({ page }, info) => {
    await masuk(page);
    const nama = `E2E Proyeksi ${info.project.name} ${Date.now()}`;

    await page.goto("/insight");
    await expect(page.getByRole("heading", { name: "Insight & proyeksi" })).toBeVisible();
    const akhirAwal = await nominal(page, "proyeksi-akhir");
    const tagihanAwal = await tagihanTerjadwal(page);

    // Jadwal tagihan sangat besar jatuh tempo hari ini di GoPay.
    await page.goto("/berulang/baru");
    await page.getByLabel("Nama").fill(nama);
    await page.getByLabel("Nominal perkiraan").fill(String(BESAR));
    await page.getByLabel("Akun").selectOption({ label: AKUN.gopay });
    await page.getByLabel("Kategori").selectOption({ label: "Tagihan" });
    await page.getByLabel("Ulangi").selectOption({ label: "Bulanan" });
    await page.getByLabel("Mulai (jatuh tempo pertama)").fill(todayInJakarta());
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Jadwal tersimpan.")).toBeVisible();

    await page.goto("/insight");
    const jadwal = page.getByRole("list", { name: "Jadwal sampai akhir bulan" });
    await expect(jadwal).toContainText(nama);
    await expect(jadwal).toContainText(`−Rp 999.999.999`);
    expect(await nominal(page, "proyeksi-akhir")).toBe(akhirAwal - BESAR);
    expect(await tagihanTerjadwal(page)).toBe(tagihanAwal + BESAR);
    await expect(page.getByTestId("proyeksi-minus")).toContainText(`Saldo ${AKUN.gopay} diperkirakan minus`);
    await expect(page.getByTestId("aman-dibelanjakan")).toHaveText("Rp 0");
    await expect(page.getByTestId("aman-per-hari")).toContainText("Kurang");

    // Beranda: kartu ringkas menautkan ke halaman Insight.
    await page.goto("/beranda");
    await expect(page.getByTestId("aman-per-hari")).toContainText("Kurang");
    await page.getByRole("link", { name: /Aman dibelanjakan/ }).click();
    await expect(page).toHaveURL(/\/insight$/);

    // Bersihkan: hapus jadwal, proyeksi kembali seperti semula.
    await page.goto("/berulang");
    await page.getByRole("link", { name: new RegExp(nama) }).click();
    await page.getByRole("button", { name: "Hapus jadwal" }).click();
    await page.getByRole("button", { name: "Ya, hapus" }).click();
    await expect(page.getByText("Jadwal dihapus.")).toBeVisible();
    await page.goto("/insight");
    expect(await nominal(page, "proyeksi-akhir")).toBe(akhirAwal);
  });
});
