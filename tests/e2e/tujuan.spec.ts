import { expect, test } from "@playwright/test";

import { addDays, todayInJakarta } from "../../src/lib/dates";
import { arsipkanAkun, bukaMenu, masuk, skipTanpaAkunUji } from "./helpers";

test.describe("tujuan tabungan", () => {
  skipTanpaAkunUji();

  test("progress dari saldo akun, setoran per bulan, tercapai, hapus", async ({ page }, info) => {
    await masuk(page);
    const tag = `${info.project.name} ${Date.now()}`;
    const akun = `E2E Tabungan ${tag}`;
    const tujuan = `E2E Liburan ${tag}`;

    await page.goto("/akun/baru");
    await page.getByLabel("Nama akun").fill(akun);
    await page.getByLabel("Saldo awal").fill("4200000");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page).toHaveURL(/\/akun$/);

    await bukaMenu(page, "Tujuan tabungan");
    await page.getByRole("link", { name: "Tambah" }).click();
    await page.getByLabel("Nama tujuan").fill(tujuan);
    await page.getByLabel("Target").fill("10000000");
    await page.getByLabel("Akun tabungan").selectOption({ label: akun });
    // Tenggat ~8 bulan lagi (tanggal yang sama).
    const t = todayInJakarta();
    const [y, m, d] = t.split("-").map(Number) as [number, number, number];
    const bulan = m + 8;
    const tenggat = `${y + Math.floor((bulan - 1) / 12)}-${String(((bulan - 1) % 12) + 1).padStart(2, "0")}-${String(Math.min(d, 28)).padStart(2, "0")}`;
    await page.getByLabel("Tenggat (opsional)").fill(tenggat);
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Tujuan tersimpan.")).toBeVisible();

    const kartu = page.getByRole("link", { name: new RegExp(tujuan) });
    await expect(kartu.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "42");
    await expect(kartu).toContainText("Rp 4.200.000 dari Rp 10.000.000");
    await expect(kartu).toContainText("kurang Rp 5.800.000");
    await expect(kartu).toContainText(/Perlu ±Rp [\d.]+\/bulan/);

    // Akun yang sudah dipakai tidak ditawarkan untuk tujuan baru.
    await page.goto("/tujuan/baru");
    await expect(page.getByLabel("Akun tabungan").locator("option", { hasText: akun })).toHaveCount(0);

    // Turunkan target -> tercapai.
    await page.goto("/tujuan");
    await kartu.click();
    await page.getByLabel("Target").fill("4000000");
    await page.getByLabel("Tenggat (opsional)").fill(addDays(t, 30));
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(page.getByText("Perubahan tersimpan.")).toBeVisible();
    await expect(kartu).toContainText("Tercapai");

    // Hapus tujuan, lalu arsipkan akun uji.
    await kartu.click();
    await page.getByRole("button", { name: "Hapus tujuan" }).click();
    await page.getByRole("button", { name: "Ya, hapus" }).click();
    await expect(page.getByText(/Tujuan dihapus/)).toBeVisible();
    await expect(kartu).toHaveCount(0);
    await arsipkanAkun(page, akun);
  });
});
