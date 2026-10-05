import { expect, test } from "@playwright/test";

import { masuk, skipTanpaAkunUji } from "./helpers";

for (const path of ["/beranda", "/transaksi", "/akun", "/budget", "/profil", "/kategori", "/berulang"]) {
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

    // Hanya satu navigasi yang terlihat: sidebar (desktop) atau bottom bar (HP).
    const nav = page.getByRole("navigation", { name: "Navigasi utama" }).locator("visible=true");
    await nav.getByRole("link", { name: "Profil" }).click();
    await expect(page).toHaveURL(/\/profil$/);

    await page.getByRole("main").getByRole("radio", { name: "Gelap" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.getByRole("button", { name: "Keluar" }).click();
    await expect(page).toHaveURL(/\/masuk$/);

    await page.goto("/beranda");
    await expect(page).toHaveURL(/\/masuk/);
  });
});
