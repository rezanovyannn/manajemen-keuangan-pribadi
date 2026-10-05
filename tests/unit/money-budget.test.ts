import { describe, expect, it } from "vitest";

import {
  BUDGET_WARNING_PERCENT,
  budgetSpent,
  budgetUsage,
  compareBudgetStatus,
  countBudgetAlerts,
  expenseByCategory,
  type BudgetStatus,
} from "@/lib/money";

describe("budgetUsage: ambang peringatan", () => {
  const limit = 1_000_000;

  it("ambang default 80%", () => {
    expect(BUDGET_WARNING_PERCENT).toBe(80);
  });

  it.each<[number, BudgetStatus, number]>([
    [0, "aman", 0],
    [799_999, "aman", 79],
    [800_000, "hampir", 80], // tepat 80%
    [999_999, "hampir", 99],
    [1_000_000, "hampir", 100], // tepat 100%: habis, belum terlampaui
    [1_000_001, "terlampaui", 100],
    [1_500_000, "terlampaui", 150],
  ])("terpakai %d -> %s (%d%%)", (spent, status, percent) => {
    const u = budgetUsage(limit, spent);
    expect(u.status).toBe(status);
    expect(u.percent).toBe(percent);
    expect(u.remaining).toBe(limit - spent);
  });

  it("tidak terkena galat float pada batas yang tidak bulat", () => {
    // 80% dari 333.333 = 266.666,4 -> 266.666 belum 80%, 266.667 sudah
    expect(budgetUsage(333_333, 266_666).status).toBe("aman");
    expect(budgetUsage(333_333, 266_667).status).toBe("hampir");
  });

  it("aman untuk nominal sangat besar", () => {
    const besar = 9_000_000_000_000_000; // ~ batas aman integer
    expect(budgetUsage(besar, besar).percent).toBe(100);
  });

  it("menolak batas 0, pemakaian minus, dan desimal", () => {
    expect(() => budgetUsage(0, 0)).toThrow(RangeError);
    expect(() => budgetUsage(1000, -1)).toThrow(RangeError);
    expect(() => budgetUsage(1000.5, 0)).toThrow(RangeError);
  });
});

describe("expenseByCategory + budgetSpent", () => {
  const categories = [
    { id: "makan", parent_id: null },
    { id: "kopi", parent_id: "makan" },
    { id: "transport", parent_id: null },
  ];
  const totals = expenseByCategory([
    { category_id: "makan", type: "expense", amount: 50_000 },
    { category_id: "kopi", type: "expense", amount: 25_000 },
    { category_id: "kopi", type: "expense", amount: 15_000 },
    { category_id: "transport", type: "expense", amount: 20_000 },
    { category_id: "gaji", type: "income", amount: 5_000_000 }, // bukan pengeluaran
    { category_id: null, type: "transfer_out", amount: 100_000 }, // transfer diabaikan
  ]);

  it("menjumlah pengeluaran per kategori", () => {
    expect(totals.get("kopi")).toBe(40_000);
    expect(totals.has("gaji")).toBe(false);
  });

  it("budget kategori utama ikut menghitung sub-kategori", () => {
    expect(budgetSpent("makan", totals, categories)).toBe(90_000);
  });

  it("budget sub-kategori hanya menghitung dirinya", () => {
    expect(budgetSpent("kopi", totals, categories)).toBe(40_000);
  });

  it("kategori tanpa transaksi bernilai 0", () => {
    expect(budgetSpent("hiburan", totals, categories)).toBe(0);
  });
});

describe("ringkasan & urutan", () => {
  it("menghitung budget yang perlu perhatian", () => {
    const s: { status: BudgetStatus }[] = [{ status: "aman" }, { status: "hampir" }, { status: "terlampaui" }, { status: "hampir" }];
    expect(countBudgetAlerts(s)).toEqual({ hampir: 2, terlampaui: 1 });
  });

  it("terlampaui di atas, aman di bawah", () => {
    const urut = (["aman", "terlampaui", "hampir"] as BudgetStatus[]).sort(compareBudgetStatus);
    expect(urut).toEqual(["terlampaui", "hampir", "aman"]);
  });
});
