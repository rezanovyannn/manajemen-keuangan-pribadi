import { describe, expect, it } from "vitest";

import { addDays, lastMonths, resolvePeriod } from "@/lib/dates";
import { expenseBreakdown, monthlyTrend, percentOf, type ReportRow } from "@/lib/money";

const r = (type: string, amount: number, category_id: string | null, occurred_on = "2026-10-05"): ReportRow => ({
  type,
  amount,
  category_id,
  occurred_on,
});

const categories = [
  { id: "makan", parent_id: null },
  { id: "kopi", parent_id: "makan" },
  { id: "transport", parent_id: null },
  { id: "tagihan", parent_id: null },
];

describe("percentOf", () => {
  it("persen bulat ke bawah, tanpa float", () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(2, 3)).toBe(66);
    expect(percentOf(5, 5)).toBe(100);
    expect(percentOf(0, 0)).toBe(0);
  });
});

describe("expenseBreakdown", () => {
  const rows = [
    r("expense", 50_000, "makan"),
    r("expense", 30_000, "kopi"), // digabung ke Makan
    r("expense", 70_000, "transport"),
    r("expense", 50_000, "tagihan"),
    r("income", 5_000_000, "gaji"), // bukan pengeluaran
    r("transfer_out", 999_999, null), // transfer diabaikan
  ];

  it("menggabung sub-kategori ke induk dan mengurutkan terbesar dulu", () => {
    const b = expenseBreakdown(rows, categories);
    expect(b.total).toBe(200_000);
    expect(b.items).toEqual([
      { categoryId: "makan", amount: 80_000, percent: 40 },
      { categoryId: "transport", amount: 70_000, percent: 35 },
      { categoryId: "tagihan", amount: 50_000, percent: 25 },
    ]);
  });

  it("total rincian sama dengan total pengeluaran", () => {
    const b = expenseBreakdown(rows, categories);
    expect(b.items.reduce((s, i) => s + i.amount, 0)).toBe(b.total);
  });

  it("kategori di luar batas digabung jadi 'Kategori lain'", () => {
    const b = expenseBreakdown(rows, categories, 2);
    expect(b.items).toEqual([
      { categoryId: "makan", amount: 80_000, percent: 40 },
      { categoryId: null, amount: 120_000, percent: 60 },
    ]);
  });

  it("kosong jika tidak ada pengeluaran", () => {
    expect(expenseBreakdown([r("income", 1, "gaji")], categories)).toEqual({ total: 0, items: [] });
  });
});

describe("monthlyTrend", () => {
  it("menjumlah per bulan, bulan kosong bernilai 0, transfer diabaikan", () => {
    const rows = [
      r("income", 5_000_000, "gaji", "2026-09-25"),
      r("expense", 100_000, "makan", "2026-09-30"),
      r("expense", 25_000, "makan", "2026-10-01"),
      r("transfer_in", 300_000, null, "2026-10-02"),
      r("expense", 1, "makan", "2026-05-01"), // di luar rentang
    ];
    expect(monthlyTrend(rows, ["2026-08", "2026-09", "2026-10"])).toEqual([
      { month: "2026-08", income: 0, expense: 0 },
      { month: "2026-09", income: 5_000_000, expense: 100_000 },
      { month: "2026-10", income: 0, expense: 25_000 },
    ]);
  });
});

describe("resolvePeriod", () => {
  const today = "2026-10-05";

  it("default bulan ini", () => {
    expect(resolvePeriod({}, today)).toMatchObject({
      key: "bulan-ini",
      start: "2026-10-01",
      end: "2026-11-01",
      to: "2026-10-31",
      label: "Oktober 2026",
    });
  });

  it("bulan lalu melewati pergantian tahun", () => {
    expect(resolvePeriod({ periode: "bulan-lalu" }, "2026-01-10")).toMatchObject({
      start: "2025-12-01",
      end: "2026-01-01",
      label: "Desember 2025",
    });
  });

  it("kustom: sampai inklusif", () => {
    const p = resolvePeriod({ periode: "kustom", dari: "2026-09-15", sampai: "2026-10-14" }, today);
    expect(p).toMatchObject({ key: "kustom", start: "2026-09-15", end: "2026-10-15" });
    expect(p.label).toBe("15 September 2026 – 14 Oktober 2026");
    expect(p.invalid).toBeUndefined();
  });

  it("kustom tidak valid jatuh ke bulan ini dengan tanda invalid", () => {
    for (const bad of [
      { dari: "2026-10-10", sampai: "2026-10-01" }, // terbalik
      { dari: "2026-02-30", sampai: "2026-03-01" }, // tanggal mustahil
      { dari: "2024-01-01", sampai: "2026-01-01" }, // lebih dari 366 hari
      {},
    ]) {
      expect(resolvePeriod({ periode: "kustom", ...bad }, today)).toMatchObject({ key: "bulan-ini", invalid: true });
    }
  });
});

describe("addDays / lastMonths", () => {
  it("melewati akhir bulan dan tahun kabisat", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("n bulan terakhir urut lama ke baru", () => {
    expect(lastMonths("2026-02", 4)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});
