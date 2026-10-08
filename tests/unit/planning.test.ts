import { describe, expect, it } from "vitest";

import {
  debtStatus,
  formatTenths,
  goalProgress,
  goalSplit,
  incomeStability,
  monthlyNeeded,
  monthsUntil,
  netWorth,
  paidByDebt,
} from "@/lib/money";

describe("goalProgress", () => {
  it("progress dari saldo akun", () => {
    expect(goalProgress(10_000_000, 4_200_000)).toEqual({ target: 10_000_000, saved: 4_200_000, remaining: 5_800_000, percent: 42, achieved: false });
  });

  it("tercapai jika saldo >= target (persen maksimal 100)", () => {
    expect(goalProgress(1_000_000, 1_500_000)).toMatchObject({ remaining: 0, percent: 100, achieved: true });
  });

  it("saldo minus: persen 0, sisa = target + kekurangan", () => {
    expect(goalProgress(1_000_000, -50_000)).toMatchObject({ remaining: 1_050_000, percent: 0, achieved: false });
  });

  it("menolak target 0 dan desimal", () => {
    expect(() => goalProgress(0, 0)).toThrow(RangeError);
    expect(() => goalProgress(1000.5, 0)).toThrow(RangeError);
  });
});

describe("monthlyNeeded", () => {
  it("dibagi rata per bulan, dibulatkan ke atas", () => {
    expect(monthsUntil("2026-10-06", "2027-06-06")).toBe(8);
    expect(monthlyNeeded(5_800_000, "2026-10-06", "2027-06-06")).toEqual({ kind: "monthly", amount: 725_000, months: 8 });
    expect(monthlyNeeded(1_000_000, "2026-10-06", "2027-01-06")).toEqual({ kind: "monthly", amount: 333_334, months: 3 });
  });

  it("kurang dari sebulan: seluruh sisa", () => {
    expect(monthlyNeeded(500_000, "2026-10-06", "2026-10-20")).toEqual({ kind: "monthly", amount: 500_000, months: 1 });
  });

  it("bulan belum penuh tidak dihitung", () => {
    expect(monthsUntil("2026-10-20", "2026-12-10")).toBe(1);
  });

  it("tanpa tenggat / sudah tercapai / tenggat lewat", () => {
    expect(monthlyNeeded(1_000, "2026-10-06", null)).toEqual({ kind: "none" });
    expect(monthlyNeeded(0, "2026-10-06", "2027-01-01")).toEqual({ kind: "none" });
    expect(monthlyNeeded(1_000, "2026-10-06", "2026-10-01")).toEqual({ kind: "overdue" });
  });
});

describe("debtStatus & paidByDebt", () => {
  it("sisa dan persen terbayar", () => {
    expect(debtStatus(1_000_000, 250_000)).toEqual({ principal: 1_000_000, paid: 250_000, remaining: 750_000, overpaid: 0, percent: 25, settled: false });
  });

  it("lunas dan kelebihan bayar", () => {
    expect(debtStatus(500_000, 500_000)).toMatchObject({ remaining: 0, overpaid: 0, settled: true, percent: 100 });
    expect(debtStatus(500_000, 520_000)).toMatchObject({ remaining: 0, overpaid: 20_000, settled: true, percent: 100 });
  });

  it("menjumlah pembayaran per utang, mengabaikan transaksi tanpa tanda", () => {
    const paid = paidByDebt([
      { debt_id: "kpr", amount: 3_250_000 },
      { debt_id: "kpr", amount: 3_250_000 },
      { debt_id: "budi", amount: 100_000 },
      { debt_id: null, amount: 999 },
    ]);
    expect(Object.fromEntries(paid)).toEqual({ kpr: 6_500_000, budi: 100_000 });
  });
});

describe("netWorth", () => {
  it("aset (akun + piutang) dikurangi utang", () => {
    expect(netWorth({ accounts: 17_490_930, receivables: 400_000, payables: 312_400_000 })).toEqual({
      assets: 17_890_930,
      liabilities: 312_400_000,
      netWorth: -294_509_070,
    });
  });
});

describe("incomeStability", () => {
  const bulan = [
    { income: 4_000_000, expense: 3_000_000 },
    { income: 9_000_000, expense: 3_500_000 },
    { income: 2_000_000, expense: 2_500_000 },
  ];

  it("rata-rata, terendah, tertinggi (bulat ke bawah)", () => {
    expect(incomeStability(bulan, 10_000_000)).toMatchObject({
      months: 3,
      avgIncome: 5_000_000,
      minIncome: 2_000_000,
      maxIncome: 9_000_000,
      avgExpense: 3_000_000,
    });
  });

  it("dana darurat dalam persepuluhan bulan", () => {
    expect(incomeStability(bulan, 10_000_000)?.runwayTenths).toBe(33); // 3,3 bulan
    expect(formatTenths(33)).toBe("3,3");
    expect(incomeStability(bulan, -5_000)?.runwayTenths).toBe(0);
  });

  it("bulan awal tanpa transaksi tidak ikut dihitung (pengguna baru mulai mencatat)", () => {
    const s = incomeStability([{ income: 0, expense: 0 }, { income: 0, expense: 0 }, ...bulan], 10_000_000);
    expect(s).toMatchObject({ months: 3, avgIncome: 5_000_000, minIncome: 2_000_000 });
  });

  it("bulan kosong di tengah tetap dihitung (memang tidak ada pemasukan)", () => {
    const s = incomeStability([bulan[0]!, { income: 0, expense: 1_000_000 }, bulan[1]!], 0);
    expect(s).toMatchObject({ months: 3, minIncome: 0 });
  });

  it("tanpa data atau tanpa pengeluaran", () => {
    expect(incomeStability([], 1_000)).toBeNull();
    expect(incomeStability([{ income: 1_000, expense: 0 }], 1_000)?.runwayTenths).toBeNull();
  });
});

describe("goalSplit", () => {
  it("tabungan sampai target, sisanya bebas dipakai", () => {
    expect(goalSplit(10_000_000, 5_000_000)).toEqual({ saved: 5_000_000, free: 5_000_000 });
    expect(goalSplit(3_000_000, 5_000_000)).toEqual({ saved: 3_000_000, free: 0 });
    expect(goalSplit(5_000_000, 5_000_000)).toEqual({ saved: 5_000_000, free: 0 });
  });

  it("saldo minus: tabungan 0, bebas dipakai ikut minus", () => {
    expect(goalSplit(-20_000, 5_000_000)).toEqual({ saved: 0, free: -20_000 });
    expect(goalSplit(0, 5_000_000)).toEqual({ saved: 0, free: 0 });
  });

  it("target harus > 0 dan nominal integer", () => {
    expect(() => goalSplit(1, 0)).toThrow();
    expect(() => goalSplit(1.5, 10)).toThrow();
  });
});
