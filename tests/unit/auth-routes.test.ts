import { describe, expect, it } from "vitest";

import { pesanErrorAuth, PESAN_UMUM } from "@/lib/auth/errors";
import { isGuestOnlyPath, isProtectedPath, safeNextPath } from "@/lib/auth/routes";

describe("isProtectedPath", () => {
  it("melindungi /beranda dan sub-halamannya", () => {
    expect(isProtectedPath("/beranda")).toBe(true);
    expect(isProtectedPath("/beranda/ringkasan")).toBe(true);
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

describe("pesanErrorAuth", () => {
  it("menerjemahkan kode error yang dikenal", () => {
    expect(pesanErrorAuth("invalid_credentials")).toBe("Email atau password salah.");
  });

  it("memakai pesan umum untuk kode yang tidak dikenal", () => {
    expect(pesanErrorAuth("kode_aneh")).toBe(PESAN_UMUM);
    expect(pesanErrorAuth(undefined)).toBe(PESAN_UMUM);
  });
});
