import { defineConfig, devices } from "@playwright/test";

// Muat .env.local (jika ada) agar test bisa membaca E2E_EMAIL/E2E_PASSWORD.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Tidak ada .env.local (misalnya di CI): test akun uji akan di-skip.
}

const PORT = 3000;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  // Simpan data ke Supabase bisa lambat saat banyak test berjalan paralel.
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
