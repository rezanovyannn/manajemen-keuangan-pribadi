import { describe, expect, it } from "vitest";

import {
  projectCashflow,
  safeToSpend,
  upcomingOccurrences,
  type Occurrence,
  type ProjectionRule,
} from "@/lib/money";

function aturan(over: Partial<ProjectionRule>): ProjectionRule {
  return {
    id: "r1",
    name: "Jadwal",
    type: "expense",
    amount: 100_000,
    account_id: "a1",
    category_id: "c1",
    frequency: "monthly",
    start_date: "2026-01-10",
    end_date: null,
    next_due_date: "2026-10-10",
    paused: false,
    ...over,
  };
}

function kejadian(over: Partial<Occurrence>): Occurrence {
  return {
    ruleId: "r1",
    name: "Jadwal",
    type: "expense",
    amount: 100_000,
    accountId: "a1",
    categoryId: "c1",
    dueDate: "2026-10-10",
    date: "2026-10-10",
    overdue: false,
    ...over,
  };
}

describe("upcomingOccurrences", () => {
  it("bulanan: hanya kemunculan sampai batas", () => {
    const occ = upcomingOccurrences([aturan({})], "2026-10-07", "2026-10-31");
    expect(occ.map((o) => o.date)).toEqual(["2026-10-10"]);
  });

  it("mingguan: semua minggu sampai akhir bulan", () => {
    const r = aturan({ frequency: "weekly", start_date: "2026-10-02", next_due_date: "2026-10-09" });
    const occ = upcomingOccurrences([r], "2026-10-07", "2026-10-31");
    expect(occ.map((o) => o.date)).toEqual(["2026-10-09", "2026-10-16", "2026-10-23", "2026-10-30"]);
  });

  it("jadwal terlambat dihitung di hari ini, tanggal asli tetap disimpan", () => {
    const r = aturan({ next_due_date: "2026-09-10" });
    const occ = upcomingOccurrences([r], "2026-10-07", "2026-10-31");
    expect(occ.map((o) => [o.dueDate, o.date, o.overdue])).toEqual([
      ["2026-09-10", "2026-10-07", true],
      ["2026-10-10", "2026-10-10", false],
    ]);
  });

  it("jadwal dijeda atau sudah berakhir diabaikan", () => {
    const occ = upcomingOccurrences(
      [aturan({ id: "p", paused: true }), aturan({ id: "e", end_date: "2026-10-05" })],
      "2026-10-07",
      "2026-10-31",
    );
    expect(occ).toEqual([]);
  });

  it("berhenti di tanggal berakhir", () => {
    const r = aturan({ frequency: "weekly", start_date: "2026-10-09", next_due_date: "2026-10-09", end_date: "2026-10-20" });
    expect(upcomingOccurrences([r], "2026-10-07", "2026-10-31").map((o) => o.date)).toEqual(["2026-10-09", "2026-10-16"]);
  });
});

describe("projectCashflow", () => {
  const accounts = [
    { id: "a1", balance: 500_000 },
    { id: "a2", balance: 1_000_000 },
  ];

  it("saldo berjalan per hari, terendah, dan saldo akhir", () => {
    const p = projectCashflow({
      accounts,
      occurrences: [
        kejadian({ date: "2026-10-08", amount: 300_000 }),
        kejadian({ date: "2026-10-09", type: "income", amount: 2_000_000, accountId: "a2" }),
      ],
      today: "2026-10-07",
      until: "2026-10-10",
    });
    expect(p.start).toBe(1_500_000);
    expect(p.points.map((x) => [x.date, x.balance])).toEqual([
      ["2026-10-07", 1_500_000],
      ["2026-10-08", 1_200_000],
      ["2026-10-09", 3_200_000],
      ["2026-10-10", 3_200_000],
    ]);
    expect(p.lowest).toEqual({ date: "2026-10-08", balance: 1_200_000 });
    expect(p.end).toBe(3_200_000);
    expect(p.income).toBe(2_000_000);
    expect(p.expense).toBe(300_000);
    expect(p.shortfalls).toEqual([]);
  });

  it("akun yang diperkirakan minus dilaporkan sekali di tanggal pertama minus", () => {
    const p = projectCashflow({
      accounts,
      occurrences: [kejadian({ date: "2026-10-08", amount: 400_000 }), kejadian({ date: "2026-10-09", amount: 200_000 }), kejadian({ date: "2026-10-10", amount: 50_000 })],
      today: "2026-10-07",
      until: "2026-10-31",
    });
    expect(p.shortfalls).toEqual([{ accountId: "a1", date: "2026-10-09", balance: -100_000 }]);
  });

  it("akun yang sudah minus hari ini langsung dilaporkan", () => {
    const p = projectCashflow({ accounts: [{ id: "a1", balance: -5_000 }], occurrences: [], today: "2026-10-07", until: "2026-10-07" });
    expect(p.shortfalls).toEqual([{ accountId: "a1", date: "2026-10-07", balance: -5_000 }]);
    expect(p.points).toHaveLength(1);
  });

  it("jadwal di akun tidak aktif diabaikan", () => {
    const p = projectCashflow({ accounts, occurrences: [kejadian({ accountId: "arsip" })], today: "2026-10-07", until: "2026-10-31" });
    expect(p.end).toBe(1_500_000);
    expect(p.expense).toBe(0);
  });

  it("tetap integer untuk nominal besar", () => {
    const p = projectCashflow({
      accounts: [{ id: "a1", balance: 9_000_000_000_000 }],
      occurrences: [kejadian({ amount: 1 })],
      today: "2026-10-07",
      until: "2026-10-31",
    });
    expect(p.end).toBe(8_999_999_999_999);
  });
});

describe("safeToSpend", () => {
  const base = { today: "2026-10-07", monthEnd: "2026-10-31" };

  it("saldo - tagihan - sisa budget, dibagi sisa hari (termasuk hari ini)", () => {
    const s = safeToSpend({ goalAccounts: [],
      ...base,
      balance: 5_000_000,
      occurrences: [kejadian({ amount: 186_000, categoryId: "tagihan" }), kejadian({ type: "income", amount: 9_000_000 })],
      budgets: [{ categoryIds: ["makan"], remaining: 1_200_000 }],
    });
    expect(s.bills).toBe(186_000);
    expect(s.budgetReserve).toBe(1_200_000);
    expect(s.safe).toBe(3_614_000);
    expect(s.days).toBe(25);
    expect(s.perDay).toBe(144_560);
  });

  it("pemasukan terjadwal tidak menambah angka aman", () => {
    const s = safeToSpend({ goalAccounts: [], ...base, balance: 100_000, occurrences: [kejadian({ type: "income", amount: 1_000_000 })], budgets: [] });
    expect(s.safe).toBe(100_000);
  });

  it("tagihan terjadwal di kategori ber-budget tidak dihitung dua kali", () => {
    const s = safeToSpend({ goalAccounts: [],
      ...base,
      balance: 1_000_000,
      occurrences: [kejadian({ amount: 150_000, categoryId: "netflix" })],
      budgets: [{ categoryIds: ["hiburan", "netflix"], remaining: 200_000 }],
    });
    expect(s.bills).toBe(150_000);
    expect(s.budgetReserve).toBe(50_000);
    expect(s.safe).toBe(800_000);
  });

  it("budget yang sudah terlampaui tidak mengurangi; tagihan melebihi sisa budget → cadangan 0", () => {
    const s = safeToSpend({ goalAccounts: [],
      ...base,
      balance: 1_000_000,
      occurrences: [kejadian({ amount: 300_000, categoryId: "b" })],
      budgets: [
        { categoryIds: ["a"], remaining: -50_000 },
        { categoryIds: ["b"], remaining: 100_000 },
      ],
    });
    expect(s.budgetReserve).toBe(0);
    expect(s.safe).toBe(700_000);
  });

  it("kekurangan: angka minus, per hari 0", () => {
    const s = safeToSpend({ goalAccounts: [], ...base, balance: 100_000, occurrences: [kejadian({ amount: 250_000 })], budgets: [] });
    expect(s.safe).toBe(-150_000);
    expect(s.perDay).toBe(0);
  });

  it("hari terakhir bulan: sisa 1 hari; pembagian dibulatkan ke bawah", () => {
    const s = safeToSpend({ goalAccounts: [], balance: 100_000, occurrences: [], budgets: [], today: "2026-10-31", monthEnd: "2026-10-31" });
    expect(s.days).toBe(1);
    expect(s.perDay).toBe(100_000);
    const t = safeToSpend({ goalAccounts: [], balance: 100_000, occurrences: [], budgets: [], today: "2026-10-29", monthEnd: "2026-10-31" });
    expect(t.perDay).toBe(33_333);
  });

  it("saldo akun tujuan dihitung tabungan sampai target; kelebihan bebas dipakai; semua tagihan dikurangkan", () => {
    const s = safeToSpend({
      ...base,
      balance: 20_000_000,
      goalAccounts: [
        { accountId: "lebih", balance: 10_000_000, target: 5_000_000 },
        { accountId: "kurang", balance: 3_000_000, target: 8_000_000 },
        { accountId: "minus", balance: -50_000, target: 1_000_000 },
      ],
      occurrences: [kejadian({ amount: 200_000, accountId: "lebih" }), kejadian({ amount: 100_000, accountId: "a1" })],
      budgets: [],
    });
    expect(s.goalSavings).toBe(8_000_000);
    expect(s.bills).toBe(300_000);
    expect(s.safe).toBe(11_700_000);
  });
});
