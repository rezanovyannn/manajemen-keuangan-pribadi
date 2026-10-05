import { describe, expect, it } from "vitest";

import { categoryOptions } from "@/lib/categories/options";
import type { CategoryItem } from "@/lib/categories/tree";
import { formatTanggal, isValidDateString, todayInJakarta } from "@/lib/dates";
import { pesanErrorTransaksi, PESAN_GAGAL_TRANSAKSI } from "@/lib/transactions/errors";
import { transactionSchema } from "@/lib/validators/transaction";

const A1 = "3f1c2b5e-8d4a-4c1e-9b7a-2e6f0d9c8a11";
const A2 = "7a2d9e4f-1b3c-4d5e-8f6a-9b0c1d2e3f40";
const K1 = "c0ffee00-1234-4abc-9def-001122334455";

describe("todayInJakarta", () => {
  it("memakai zona WIB, bukan UTC", () => {
    // 5 Okt 2026 pukul 18:30 UTC = 6 Okt 2026 pukul 01:30 WIB
    expect(todayInJakarta(new Date("2026-10-05T18:30:00Z"))).toBe("2026-10-06");
    expect(todayInJakarta(new Date("2026-10-05T16:59:00Z"))).toBe("2026-10-05");
  });
});

describe("isValidDateString", () => {
  it("menerima tanggal kalender yang ada", () => {
    expect(isValidDateString("2026-10-05")).toBe(true);
    expect(isValidDateString("2028-02-29")).toBe(true);
  });

  it("menolak tanggal mustahil atau format lain", () => {
    for (const bad of ["2026-02-30", "2027-02-29", "2026-13-01", "05-10-2026", "2026-10-5", ""]) {
      expect(isValidDateString(bad)).toBe(false);
    }
  });
});

describe("formatTanggal", () => {
  it("memformat dalam Bahasa Indonesia", () => {
    expect(formatTanggal("2026-10-05")).toBe("5 Oktober 2026");
    expect(formatTanggal("2026-10-05", { weekday: true })).toBe("Senin, 5 Oktober 2026");
  });
});

describe("transactionSchema", () => {
  const umum = { amount: "35.000", occurredOn: "2026-10-05", note: "  makan siang  " };

  it("pengeluaran valid: nominal integer, catatan dirapikan", () => {
    const r = transactionSchema.parse({ type: "expense", accountId: A1, categoryId: K1, ...umum });
    expect(r).toEqual({
      type: "expense",
      accountId: A1,
      categoryId: K1,
      amount: 35_000,
      occurredOn: "2026-10-05",
      note: "makan siang",
    });
  });

  it("catatan kosong menjadi null", () => {
    const r = transactionSchema.parse({ type: "income", accountId: A1, categoryId: K1, ...umum, note: "   " });
    expect(r.note).toBeNull();
  });

  it("menolak nominal 0 dan desimal", () => {
    expect(transactionSchema.safeParse({ type: "expense", accountId: A1, categoryId: K1, ...umum, amount: "0" }).success).toBe(false);
    expect(transactionSchema.safeParse({ type: "expense", accountId: A1, categoryId: K1, ...umum, amount: "1,5" }).success).toBe(false);
  });

  it("pemasukan/pengeluaran wajib akun dan kategori", () => {
    const r = transactionSchema.safeParse({ type: "expense", accountId: "", categoryId: "", ...umum });
    expect(r.success).toBe(false);
    const paths = r.error?.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["accountId", "categoryId"]));
  });

  it("transfer valid tanpa kategori", () => {
    const r = transactionSchema.parse({ type: "transfer", fromAccountId: A1, toAccountId: A2, ...umum });
    expect(r).toMatchObject({ type: "transfer", fromAccountId: A1, toAccountId: A2, amount: 35_000 });
  });

  it("transfer ke akun yang sama ditolak di field akun tujuan", () => {
    const r = transactionSchema.safeParse({ type: "transfer", fromAccountId: A1, toAccountId: A1, ...umum });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["toAccountId"]);
  });

  it("menolak tanggal tidak valid dan jenis tidak dikenal", () => {
    expect(transactionSchema.safeParse({ type: "expense", accountId: A1, categoryId: K1, ...umum, occurredOn: "2026-02-30" }).success).toBe(false);
    expect(transactionSchema.safeParse({ type: "transfer_in", accountId: A1, categoryId: K1, ...umum }).success).toBe(false);
  });
});

describe("categoryOptions", () => {
  const kat = (id: string, name: string, extra: Partial<CategoryItem> = {}): CategoryItem => ({
    id, name, parent_id: null, type: "expense", archived_at: null, ...extra,
  });

  it("membuat pilihan datar dengan label induk › anak", () => {
    const opts = categoryOptions([
      kat("1", "Makan & Minum"),
      kat("2", "Kopi", { parent_id: "1" }),
      kat("3", "Gaji", { type: "income" }),
    ]);
    expect(opts).toEqual([
      { value: "3", label: "Gaji", type: "income" },
      { value: "1", label: "Makan & Minum", type: "expense" },
      { value: "2", label: "Makan & Minum › Kopi", type: "expense" },
    ]);
  });
});

describe("pesanErrorTransaksi", () => {
  it("menerjemahkan pesan dari database", () => {
    expect(pesanErrorTransaksi({ code: "P0001", message: "Akun sudah diarsipkan" })).toMatch(/diarsipkan/);
    expect(pesanErrorTransaksi({ code: "23503" })).toMatch(/tidak valid/);
    expect(pesanErrorTransaksi({ code: "XX000", message: "aneh" })).toBe(PESAN_GAGAL_TRANSAKSI);
  });
});
