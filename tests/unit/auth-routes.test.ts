import { describe, expect, it } from "vitest";

import { isNavActive, NAV_ITEMS } from "@/components/app-nav/nav-items";
import { pesanErrorAuth, PESAN_UMUM } from "@/lib/auth/errors";
import { isGuestOnlyPath, isProtectedPath, safeNextPath } from "@/lib/auth/routes";

describe("isProtectedPath", () => {
  it("melindungi semua halaman aplikasi dan sub-halamannya", () => {
    for (const p of ["/beranda", "/transaksi", "/akun", "/budget", "/profil", "/kategori", "/berulang", "/tujuan", "/utang", "/net-worth"]) {
      expect(isProtectedPath(p)).toBe(true);
    }
    expect(isProtectedPath("/beranda/ringkasan")).toBe(true);
  });

  it("melindungi setiap menu navigasi", () => {
    for (const { href } of NAV_ITEMS) {
      expect(isProtectedPath(href)).toBe(true);
    }
  });

  it("tidak melindungi halaman publik atau path yang hanya mirip", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/masuk")).toBe(false);
    expect(isProtectedPath("/berandaku")).toBe(false);
  });
});

describe("isGuestOnlyPath", () => {
  it("menandai /masuk dan /daftar sebagai halaman tamu", () => {
    expect(isGuestOnlyPath("/masuk")).toBe(true);
    expect(isGuestOnlyPath("/daftar")).toBe(true);
    expect(isGuestOnlyPath("/beranda")).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("mengizinkan path internal", () => {
    expect(safeNextPath("/beranda?bulan=10")).toBe("/beranda?bulan=10");
  });

  it("menolak URL luar dan memakai beranda sebagai default", () => {
    for (const bad of [null, "", "https://jahat.com", "//jahat.com", "/\\jahat.com", "beranda"]) {
      expect(safeNextPath(bad)).toBe("/beranda");
    }
  });
});

describe("isNavActive", () => {
  it("aktif di halaman menu dan sub-halamannya saja", () => {
    expect(isNavActive("/transaksi", "/transaksi")).toBe(true);
    expect(isNavActive("/transaksi/baru", "/transaksi")).toBe(true);
    expect(isNavActive("/beranda", "/transaksi")).toBe(false);
    expect(isNavActive("/budgeting", "/budget")).toBe(false);
  });
});

describe("pesanErrorAuth", () => {
  it("menerjemahkan kode error yang dikenal", () => {
    expect(pesanErrorAuth("invalid_credentials")).toBe("Email atau password salah.");
  });

  it("memakai pesan umum untuk kode yang tidak dikenal", () => {
    expect(pesanErrorAuth("kode_aneh")).toBe(PESAN_UMUM);
    expect(pesanErrorAuth(undefined)).toBe(PESAN_UMUM);
  });
});
