import { expect, test, type Page } from "@playwright/test";

import { arsipkanAkun, masuk, skipTanpaAkunUji } from "./helpers";

async function buatAkun(page: Page, nama: string, saldoAwal: string) {
  await page.goto("/akun/baru");
  await page.getByLabel("Nama akun").fill(nama);
  await page.getByLabel("Saldo awal").fill(saldoAwal);
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(page).toHaveURL(/\/akun$/);
}

async function catat(page: Page, t: { tipe: "expense" | "income" | "transfer"; nominal: string; akun: string; ke?: string; kategori?: string; catatan: string }) {
  await page.goto(`/transaksi/baru?tipe=${t.tipe}`);
  await page.getByLabel("Nominal").fill(t.nominal);
  if (t.tipe === "transfer") {
    await page.getByLabel("Dari akun").selectOption({ label: t.akun });
    await page.getByLabel("Ke akun").selectOption({ label: t.ke! });
  } else {
    await page.getByLabel("Akun").selectOption({ label: t.akun });
    await page.getByLabel("Kategori").selectOption({ label: t.kategori! });
  }
  await page.getByLabel("Catatan (opsional)").fill(t.catatan);
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page).toHaveURL(/tersimpan=1/);
}

async function bukaTransaksi(page: Page, catatan: string) {
  await page.goto(`/transaksi?cari=${encodeURIComponent(catatan)}`);
  await page.getByRole("main").getByRole("listitem").first().getByRole("link").click();
  await expect(page.getByRole("heading", { name: "Ubah transaksi" })).toBeVisible();
}

async function cekSaldo(page: Page, harapan: Record<string, string>) {
  await page.goto("/akun");
  for (const [nama, saldo] of Object.entries(harapan)) {
    const baris = page.getByRole("link", { name: new RegExp(nama) });
    await expect(baris.locator("p.tabular-nums")).toHaveText(saldo);
  }
}

test.describe("saldo akun", () => {
  skipTanpaAkunUji();

  test("konsisten dengan riwayat transaksi, termasuk setelah edit dan hapus", async ({ page }, info) => {
    await masuk(page);
    const tag = `${info.project.name} ${Date.now()}`;
    const dompet = `E2E Saldo Dompet ${tag}`;
    const bank = `E2E Saldo Bank ${tag}`;

    await buatAkun(page, dompet, "500000");
    await buatAkun(page, bank, "1000000");
    await cekSaldo(page, { [dompet]: "Rp 500.000", [bank]: "Rp 1.000.000" });

    await catat(page, { tipe: "expense", nominal: "25000", akun: dompet, kategori: "Makan & Minum", catatan: `makan ${tag}` });
    await catat(page, { tipe: "income", nominal: "100000", akun: bank, kategori: "Gaji", catatan: `gaji ${tag}` });
    await catat(page, { tipe: "transfer", nominal: "50000", akun: bank, ke: dompet, catatan: `tarik ${tag}` });
    // Dompet: 500.000 - 25.000 + 50.000; Bank: 1.000.000 + 100.000 - 50.000
    await cekSaldo(page, { [dompet]: "Rp 525.000", [bank]: "Rp 1.050.000" });

    // Edit pengeluaran 25.000 -> 30.000.
    await bukaTransaksi(page, `makan ${tag}`);
    await page.getByLabel("Nominal").fill("30000");
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(page.getByText("Perubahan tersimpan.")).toBeVisible();
    await cekSaldo(page, { [dompet]: "Rp 520.000", [bank]: "Rp 1.050.000" });

    // Edit transfer: nominal 50.000 -> 80.000 (kedua sisi ikut berubah).
    await bukaTransaksi(page, `tarik ${tag}`);
    await page.getByLabel("Nominal").fill("80000");
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(page.getByText("Perubahan tersimpan.")).toBeVisible();
    await cekSaldo(page, { [dompet]: "Rp 550.000", [bank]: "Rp 1.020.000" });

    // Hapus transfer: kedua sisi hilang.
    await bukaTransaksi(page, `tarik ${tag}`);
    await page.getByRole("button", { name: "Hapus transaksi" }).click();
    await page.getByRole("button", { name: "Ya, hapus" }).click();
    await expect(page.getByText("Transaksi dihapus.")).toBeVisible();
    await cekSaldo(page, { [dompet]: "Rp 470.000", [bank]: "Rp 1.100.000" });

    // Bersihkan.
    for (const catatan of [`makan ${tag}`, `gaji ${tag}`]) {
      await bukaTransaksi(page, catatan);
      await page.getByRole("button", { name: "Hapus transaksi" }).click();
      await page.getByRole("button", { name: "Ya, hapus" }).click();
      await expect(page.getByText("Transaksi dihapus.")).toBeVisible();
    }
    await cekSaldo(page, { [dompet]: "Rp 500.000", [bank]: "Rp 1.000.000" });
    await arsipkanAkun(page, dompet);
    await arsipkanAkun(page, bank);
  });
});
