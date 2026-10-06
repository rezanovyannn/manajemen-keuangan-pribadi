import { expect, test, type Page } from "@playwright/test";

import { parseRupiah } from "../../src/lib/money/rupiah";

// Akun uji dari .env.local (E2E_EMAIL/E2E_PASSWORD). Jangan pakai akun berisi data asli.
export const akunUji = {
  email: process.env.E2E_EMAIL ?? "",
  password: process.env.E2E_PASSWORD ?? "",
};

// Empat akun tetap di akun uji. Test memakai akun-akun ini (bukan membuat akun baru),
// berjalan berurutan, dan selalu menghapus transaksinya sendiri.
export const AKUN = {
  bri: "BRI",
  mandiri: "Mandiri",
  gopay: "GoPay",
  cash: "Cash On Hand",
} as const;

export function skipTanpaAkunUji() {
  test.skip(!akunUji.email || !akunUji.password, "E2E_EMAIL/E2E_PASSWORD belum diisi");
}

// Penanda unik per test. Catatan transaksi uji SELALU diawali "E2E" agar pembersih
// otomatis (globalTeardown) bisa menghapusnya jika test berhenti di tengah jalan.
export const tagUji = (project: string, label: string) => `E2E ${label} ${project} ${Date.now()}`;

// Arsipkan akun uji yang dibuat test agar tidak menumpuk di daftar pilihan.
export async function arsipkanAkun(page: Page, nama: string) {
  await page.goto("/akun");
  await page.getByRole("link", { name: new RegExp(nama) }).click();
  await page.getByRole("button", { name: "Arsipkan akun" }).click();
  await expect(page).toHaveURL(/\/akun$/);
}

// Klik menu navigasi. Di HP, menu ada di laci yang dibuka lewat tombol "Buka menu".
export async function bukaMenu(page: Page, label: string) {
  const tombol = page.getByRole("button", { name: "Buka menu" });
  if (await tombol.isVisible()) await tombol.click();
  const link = page.getByRole("navigation", { name: "Navigasi utama" }).locator("visible=true").getByRole("link", { name: label, exact: true });
  const href = (await link.getAttribute("href")) ?? "";
  await link.click();
  // Tunggu halaman tujuan benar-benar terbuka sebelum langkah berikutnya.
  await page.waitForURL((url) => url.pathname === href);
}

export async function masuk(page: Page) {
  await page.goto("/masuk");
  await page.getByLabel("Email").fill(akunUji.email);
  await page.getByLabel("Password").fill(akunUji.password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/beranda$/);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Baris akun di halaman Akun (nama akun di awal teks link).
export const barisAkun = (page: Page, nama: string) => page.getByRole("link", { name: new RegExp(`^${escapeRe(nama)}\\b`) });

// Saldo terkini akun (dari halaman Akun) sebagai bilangan bulat.
export async function saldoAkun(page: Page, nama: string): Promise<number> {
  await page.goto("/akun");
  const teks = (await barisAkun(page, nama).locator("p.tabular-nums").textContent()) ?? "";
  const n = parseRupiah(teks.replace("−", "-"));
  expect(n, `saldo ${nama}: ${teks}`).not.toBeNull();
  return n!;
}

export type TxUji = {
  tipe: "expense" | "income" | "transfer";
  nominal: string;
  akun: string;
  ke?: string;
  kategori?: string;
  tanggal?: string;
  biaya?: string;
  catatan: string; // wajib diawali "E2E"
};

// Catat transaksi lewat form (opsional: tanggal, biaya admin).
export async function catat(page: Page, t: TxUji) {
  expect(t.catatan.startsWith("E2E"), "catatan transaksi uji harus diawali E2E").toBe(true);
  await page.goto(`/transaksi/baru?tipe=${t.tipe}`);
  await page.getByLabel("Nominal").fill(t.nominal);
  if (t.tipe === "transfer") {
    await page.getByLabel("Dari akun").selectOption({ label: t.akun });
    await page.getByLabel("Ke akun").selectOption({ label: t.ke! });
  } else {
    await page.getByLabel("Akun").selectOption({ label: t.akun });
    await page.getByLabel("Kategori").selectOption({ label: t.kategori! });
  }
  if (t.tanggal) await page.getByLabel("Tanggal").fill(t.tanggal);
  if (t.biaya) await page.getByLabel("Biaya admin (opsional)").fill(t.biaya);
  await page.getByLabel("Catatan (opsional)").fill(t.catatan);
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page).toHaveURL(/tersimpan=1/);
}

// Daftar transaksi hasil pencarian catatan (bulan berjalan, atau `bulan` YYYY-MM).
export async function cariTransaksi(page: Page, catatan: string, bulan?: string) {
  await page.goto(`/transaksi?${bulan ? `bulan=${bulan}&` : ""}cari=${encodeURIComponent(catatan)}`);
  return page.getByRole("main").getByRole("listitem");
}

// Hapus semua transaksi yang catatannya mengandung `catatan` (kedua sisi transfer + biaya ikut terhapus).
export async function hapusTransaksi(page: Page, catatan: string, bulan?: string) {
  for (let i = 0; i < 20; i++) {
    const daftar = await cariTransaksi(page, catatan, bulan);
    if ((await daftar.count()) === 0) return;
    await daftar.first().getByRole("link").click();
    await page.getByRole("button", { name: "Hapus transaksi" }).click();
    await page.getByRole("button", { name: "Ya, hapus" }).click();
    await expect(page.getByText("Transaksi dihapus.")).toBeVisible();
  }
}
