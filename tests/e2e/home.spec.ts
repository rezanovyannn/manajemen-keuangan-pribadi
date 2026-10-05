import { expect, test } from "@playwright/test";

test("halaman awal tampil", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Keuangan/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test.describe("mode gelap", () => {
  test.use({ colorScheme: "dark" });

  test("mengikuti pengaturan gelap dari perangkat", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
