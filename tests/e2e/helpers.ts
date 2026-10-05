import { expect, test, type Page } from "@playwright/test";

// Akun uji dari .env.local (E2E_EMAIL/E2E_PASSWORD). Jangan pakai akun berisi data asli.
export const akunUji = {
  email: process.env.E2E_EMAIL ?? "",
  password: process.env.E2E_PASSWORD ?? "",
};

export function skipTanpaAkunUji() {
  test.skip(!akunUji.email || !akunUji.password, "E2E_EMAIL/E2E_PASSWORD belum diisi");
}

// Arsipkan akun uji yang dibuat test agar tidak menumpuk di daftar pilihan.
export async function arsipkanAkun(page: Page, nama: string) {
  await page.goto("/akun");
  await page.getByRole("link", { name: new RegExp(nama) }).click();
  await page.getByRole("button", { name: "Arsipkan akun" }).click();
  await expect(page).toHaveURL(/\/akun$/);
}

export async function masuk(page: Page) {
  await page.goto("/masuk");
  await page.getByLabel("Email").fill(akunUji.email);
  await page.getByLabel("Password").fill(akunUji.password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/beranda$/);
}
