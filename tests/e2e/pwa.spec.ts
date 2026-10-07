import { expect, test } from "@playwright/test";

test.describe("PWA", () => {
  test("manifest valid, ikon tersedia, halaman menautkan manifest", async ({ page, request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const m = await res.json();
    expect(m).toMatchObject({ name: "Keuangan Pribadi", short_name: "Keuangan", start_url: "/beranda", display: "standalone" });
    expect(m.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}:${i.purpose}`)).toEqual([
      "192x192:any",
      "512x512:any",
      "512x512:maskable",
    ]);

    for (const icon of m.icons as { src: string }[]) {
      const r = await request.get(icon.src);
      expect(r.status(), icon.src).toBe(200);
      expect(r.headers()["content-type"]).toContain("image/png");
    }

    await page.goto("/");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute("content", /#/);
  });

  test("header keamanan dikirim", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });
});
