import { expect, test, type Page } from "@playwright/test";

import { parseRupiah } from "../../src/lib/money/rupiah";
import { bukaMenu, masuk, skipTanpaAkunUji } from "./helpers";

async function angka(page: Page, testId: string) {
  const teks = (await page.getByTestId(testId).textContent()) ?? "";
  const n = parseRupiah(teks.replace("−", "-"));
  expect(n, `angka ${testId}: ${teks}`).not.toBeNull();
  return n!;
}

test.describe("net worth", () => {
  skipTanpaAkunUji();

  test("net worth = aset - kewajiban, utang & piutang tampil, stabilitas pendapatan", async ({ page }, info) => {
    await masuk(page);
    const tag = `${info.project.name} ${Date.now()}`;
    const utang = `E2E NW Utang ${tag}`;
    const piutang = `E2E NW Piutang ${tag}`;

    for (const [nama, jenis, label] of [
      [utang, "utang", "Jumlah utang"],
      [piutang, "piutang", "Jumlah dipinjamkan"],
    ] as const) {
      await page.goto(`/utang/baru?jenis=${jenis}`);
      await page.getByLabel("Nama", { exact: true }).fill(nama);
      await page.getByLabel(label).fill(jenis === "utang" ? "300000" : "125000");
      await page.getByRole("button", { name: "Simpan" }).click();
      await expect(page.getByText("Tersimpan.")).toBeVisible();
    }

    await bukaMenu(page, "Net worth");
    await expect(page.getByRole("heading", { name: "Net worth", level: 1 })).toBeVisible();
    const aset = await angka(page, "aset");
    const kewajiban = await angka(page, "kewajiban");
    expect(await angka(page, "net-worth")).toBe(aset - kewajiban);

    await expect(page.getByRole("region", { name: "Kewajiban" }).getByRole("link", { name: new RegExp(utang) })).toContainText("Rp 300.000");
    await expect(page.getByRole("region", { name: "Aset" }).getByRole("link", { name: new RegExp(piutang) })).toContainText("Rp 125.000");
    await expect(page.getByRole("heading", { name: "Stabilitas pendapatan" })).toBeVisible();

    // Beranda menampilkan net worth yang sama.
    await page.goto("/beranda");
    await expect(page.getByTestId("dash-net-worth")).toBeVisible();

    // Bersihkan (belum ada pembayaran -> bisa dihapus).
    for (const [nama, jenis] of [[utang, "utang"], [piutang, "piutang"]] as const) {
      await page.goto(`/utang?jenis=${jenis}`);
      await page.getByRole("link", { name: new RegExp(nama) }).click();
      await page.getByRole("button", { name: "Hapus" }).click();
      await page.getByRole("button", { name: "Ya, hapus" }).click();
      await expect(page.getByText("Dihapus.")).toBeVisible();
    }
  });
});
