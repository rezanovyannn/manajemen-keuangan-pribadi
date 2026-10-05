import { describe, expect, it } from "vitest";

import { daftarSchema, masukSchema } from "@/lib/validators/auth";

describe("masukSchema", () => {
  it("menormalkan email (trim + huruf kecil)", () => {
    const r = masukSchema.parse({ email: "  Budi@Contoh.COM ", password: "rahasia" });
    expect(r.email).toBe("budi@contoh.com");
  });

  it("menolak email kosong dan format salah", () => {
    expect(masukSchema.safeParse({ email: "", password: "x" }).success).toBe(false);
    expect(masukSchema.safeParse({ email: "bukan-email", password: "x" }).success).toBe(false);
  });

  it("menolak password kosong", () => {
    expect(masukSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});

describe("daftarSchema", () => {
  const valid = { displayName: "Budi", email: "budi@contoh.com", password: "12345678" };

  it("menerima input valid dan merapikan nama", () => {
    expect(daftarSchema.parse({ ...valid, displayName: "  Budi  " }).displayName).toBe("Budi");
  });

  it("mewajibkan password minimal 8 karakter", () => {
    const r = daftarSchema.safeParse({ ...valid, password: "1234567" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("Password minimal 8 karakter.");
  });

  it("menolak nama kosong atau lebih dari 100 karakter", () => {
    expect(daftarSchema.safeParse({ ...valid, displayName: "   " }).success).toBe(false);
    expect(daftarSchema.safeParse({ ...valid, displayName: "a".repeat(101) }).success).toBe(false);
  });
});
