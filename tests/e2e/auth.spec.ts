import { expect, test } from "@playwright/test";

import { bukaMenu, masuk, skipTanpaAkunUji } from "./helpers";

for (const path of ["/beranda", "/transaksi", "/akun", "/budget", "/profil", "/kategori", "/berulang", "/tujuan", "/utang", "/net-worth"]) {
  test(`${path} mengarahkan tamu ke /masuk`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/masuk\\?next=${encodeURIComponent(path)}$`));
    await expect(page.getByRole("heading", { name: "Masuk" })).toBeVisible();
  });
}

test("form masuk menampilkan pesan validasi", async ({ page }) => {
  await page.goto("/masuk");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page.getByText("Email wajib diisi.")).toBeVisible();
  await expect(page.getByText("Password wajib diisi.")).toBeVisible();
});

test("form daftar menolak password pendek", async ({ page }) => {
  await page.goto("/daftar");
  await page.getByLabel("Nama").fill("Penguji");
  await page.getByLabel("Email").fill("penguji@contoh.com");
  await page.getByLabel("Password").fill("pendek");
  await page.getByRole("button", { name: "Daftar" }).click();
  await expect(page.getByText("Password minimal 8 karakter.")).toBeVisible();
});

// Alur login sungguhan butuh akun uji (lihat tests/e2e/helpers.ts).
test.describe("dengan akun uji", () => {
  skipTanpaAkunUji();

  test("login, navigasi, ganti tema, lalu keluar", async ({ page }) => {
    await masuk(page);
    await expect(page.getByRole("heading", { name: /^Halo, / })).toBeVisible();

    // Desktop: sidebar. HP: panel "Lainnya" di navigasi bawah (tertutup setelah memilih).
    await bukaMenu(page, "Transaksi berulang");
    await expect(page).toHaveURL(/\/berulang$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await bukaMenu(page, "Profil");
    await expect(page).toHaveURL(/\/profil$/);

    await page.getByRole("main").getByRole("radio", { name: "Gelap" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.getByRole("button", { name: "Keluar" }).click();
    await expect(page).toHaveURL(/\/masuk$/);

    await page.goto("/beranda");
    await expect(page).toHaveURL(/\/masuk/);
  });
});
