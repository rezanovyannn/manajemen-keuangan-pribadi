import { describe, expect, it } from "vitest";

import { formatDigits } from "@/components/money-input";
import { accountTypeLabel } from "@/lib/accounts/types";
import { accountSchema } from "@/lib/validators/account";
import { rupiahInput } from "@/lib/validators/money";

describe("rupiahInput", () => {
  const schema = rupiahInput({ label: "Saldo awal" });

  it("mengubah teks berformat menjadi bilangan bulat", () => {
    expect(schema.parse("1.250.000")).toBe(1_250_000);
    expect(schema.parse("0")).toBe(0);
  });

  it("memberi satu pesan jelas untuk input tidak valid", () => {
    const r = schema.safeParse("1,5");
    expect(r.success).toBe(false);
    expect(r.error?.issues).toHaveLength(1);
    expect(r.error?.issues[0]?.message).toMatch(/angka bulat/);
  });

  it("menolak nilai di bawah minimum", () => {
    const r = schema.safeParse("-5.000");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("Saldo awal minimal Rp 0.");
  });

  it("mewajibkan isian", () => {
    expect(schema.safeParse("  ").error?.issues[0]?.message).toBe("Saldo awal wajib diisi.");
  });
});

describe("accountSchema", () => {
  const valid = { name: " BCA ", type: "bank", openingBalance: "2.500.000" };

  it("menerima input valid", () => {
    expect(accountSchema.parse(valid)).toEqual({ name: "BCA", type: "bank", openingBalance: 2_500_000, investmentKind: null });
  });

  it("akun investasi wajib jenis aset; akun biasa mengabaikannya", () => {
    expect(accountSchema.safeParse({ ...valid, type: "investment" }).error?.issues[0]?.message).toBe("Pilih jenis aset.");
    expect(accountSchema.safeParse({ ...valid, type: "investment", investmentKind: "properti" }).success).toBe(false);
    expect(accountSchema.parse({ ...valid, type: "investment", investmentKind: "emas" }).investmentKind).toBe("emas");
    expect(accountSchema.parse({ ...valid, investmentKind: "emas" }).investmentKind).toBeNull();
  });

  it("menolak jenis akun yang tidak dikenal", () => {
    expect(accountSchema.safeParse({ ...valid, type: "kartu-kredit" }).success).toBe(false);
  });

  it("menolak nama kosong atau lebih dari 50 karakter", () => {
    expect(accountSchema.safeParse({ ...valid, name: "  " }).success).toBe(false);
    expect(accountSchema.safeParse({ ...valid, name: "a".repeat(51) }).success).toBe(false);
  });
});

describe("formatDigits (input nominal)", () => {
  it.each([
    ["", ""],
    ["0", "0"],
    ["007", "7"],
    ["1250000", "1.250.000"],
    ["1.250.000", "1.250.000"],
    ["Rp 35rb", "35"],
  ])("%j -> %j", (raw, expected) => {
    expect(formatDigits(raw)).toBe(expected);
  });
});

describe("accountTypeLabel", () => {
  it("memberi label Bahasa Indonesia", () => {
    expect(accountTypeLabel("cash")).toBe("Tunai");
    expect(accountTypeLabel("ewallet")).toBe("E-wallet");
  });
});
