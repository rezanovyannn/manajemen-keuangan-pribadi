import { addAmounts } from "./balance";
import { percentOf } from "./report";
import { assertAmount } from "./rupiah";

const big = (n: number) => BigInt(assertAmount(n));

// Pembagian bulat ke atas tanpa float.
function ceilDiv(a: number, b: number): number {
  const A = big(a);
  const B = big(b);
  return Number((A + B - BigInt(1)) / B);
}

// ---------------------------------------------------------------------------
// Tujuan tabungan (progress = saldo akun yang dihubungkan)
// ---------------------------------------------------------------------------

export type GoalProgress = {
  target: number;
  saved: number; // saldo akun (bisa minus)
  remaining: number; // >= 0
  percent: number; // 0..100
  achieved: boolean;
};

export function goalProgress(target: number, saved: number): GoalProgress {
  assertAmount(target);
  assertAmount(saved);
  if (target <= 0) throw new RangeError("Target harus lebih dari 0.");
  const remaining = saved >= target ? 0 : addAmounts(target, -saved);
  return {
    target,
    saved,
    remaining,
    percent: saved <= 0 ? 0 : Math.min(100, percentOf(saved, target)),
    achieved: saved >= target,
  };
}

// Jumlah bulan penuh dari `today` sampai `deadline` (keduanya "YYYY-MM-DD").
export function monthsUntil(today: string, deadline: string): number {
  const [y1, m1, d1] = today.split("-").map(Number) as [number, number, number];
  const [y2, m2, d2] = deadline.split("-").map(Number) as [number, number, number];
  return (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
}

export type MonthlyNeed =
  | { kind: "none" } // tanpa tenggat atau sudah tercapai
  | { kind: "overdue" } // tenggat sudah lewat tapi belum tercapai
  | { kind: "monthly"; amount: number; months: number };

// Setoran per bulan agar tercapai tepat waktu (dibulatkan ke atas).
// Kurang dari sebulan lagi -> seluruh sisa dihitung sebagai satu bulan.
export function monthlyNeeded(remaining: number, today: string, deadline: string | null): MonthlyNeed {
  if (!deadline || remaining <= 0) return { kind: "none" };
  if (deadline < today) return { kind: "overdue" };
  const months = Math.max(1, monthsUntil(today, deadline));
  return { kind: "monthly", amount: ceilDiv(remaining, months), months };
}

// ---------------------------------------------------------------------------
// Utang & piutang (sisa = jumlah awal - pembayaran yang ditandai)
// ---------------------------------------------------------------------------

export type DebtStatus = {
  principal: number;
  paid: number;
  remaining: number; // >= 0
  overpaid: number; // kelebihan bayar, >= 0
  percent: number; // persen terbayar, 0..100
  settled: boolean;
};

export function debtStatus(principal: number, paid: number): DebtStatus {
  assertAmount(principal);
  assertAmount(paid);
  if (principal <= 0) throw new RangeError("Jumlah awal harus lebih dari 0.");
  const settled = paid >= principal;
  return {
    principal,
    paid,
    remaining: settled ? 0 : addAmounts(principal, -paid),
    overpaid: settled ? addAmounts(paid, -principal) : 0,
    percent: Math.min(100, percentOf(paid, principal)),
    settled,
  };
}

// Total pembayaran per utang/piutang dari transaksi bertanda.
export function paidByDebt(rows: { debt_id: string | null; amount: number }[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const r of rows) {
    if (!r.debt_id) continue;
    totals.set(r.debt_id, addAmounts(totals.get(r.debt_id) ?? 0, r.amount));
  }
  return totals;
}

// ---------------------------------------------------------------------------
// Net worth
// ---------------------------------------------------------------------------

export function netWorth(input: { accounts: number; receivables: number; payables: number }) {
  const assets = addAmounts(input.accounts, input.receivables);
  return { assets, liabilities: input.payables, netWorth: addAmounts(assets, -input.payables) };
}

// ---------------------------------------------------------------------------
// Pendapatan tidak tetap & dana darurat
// ---------------------------------------------------------------------------

export const TARGET_DANA_DARURAT_BULAN = { min: 3, max: 6 } as const;

export type IncomeStability = {
  months: number;
  avgIncome: number; // rata-rata dibulatkan ke bawah
  minIncome: number;
  maxIncome: number;
  avgExpense: number;
  // Berapa bulan saldo cukup menutup rata-rata pengeluaran, dalam persepuluhan bulan
  // (34 = 3,4 bulan). null jika belum ada data pengeluaran.
  runwayTenths: number | null;
};

export function incomeStability(points: { income: number; expense: number }[], totalSaldo: number): IncomeStability | null {
  if (points.length === 0) return null;
  const n = BigInt(points.length);
  const sumIncome = points.reduce((s, p) => addAmounts(s, p.income), 0);
  const sumExpense = points.reduce((s, p) => addAmounts(s, p.expense), 0);
  const avgExpense = Number(big(sumExpense) / n);
  return {
    months: points.length,
    avgIncome: Number(big(sumIncome) / n),
    minIncome: Math.min(...points.map((p) => p.income)),
    maxIncome: Math.max(...points.map((p) => p.income)),
    avgExpense,
    runwayTenths: avgExpense > 0 ? Number((big(Math.max(0, totalSaldo)) * BigInt(10)) / big(avgExpense)) : null,
  };
}

// 34 -> "3,4"
export function formatTenths(tenths: number): string {
  return `${Math.floor(tenths / 10)},${tenths % 10}`;
}
