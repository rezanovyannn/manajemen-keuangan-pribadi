import { addAmounts } from "./balance";
import { assertAmount } from "./rupiah";

// Ambang peringatan: budget dianggap "hampir habis" mulai 80% terpakai.
export const BUDGET_WARNING_PERCENT = 80;

export type BudgetStatus = "aman" | "hampir" | "terlampaui";

export type BudgetUsage = {
  limit: number;
  spent: number;
  remaining: number; // minus jika terlampaui
  percent: number; // persen bulat ke bawah, bisa > 100
  status: BudgetStatus;
};

// Semua perbandingan memakai BigInt agar tidak ada pembulatan float.
export function budgetUsage(limit: number, spent: number): BudgetUsage {
  assertAmount(limit);
  assertAmount(spent);
  if (limit <= 0) throw new RangeError("Batas budget harus lebih dari 0.");
  if (spent < 0) throw new RangeError("Pemakaian tidak boleh minus.");

  const L = BigInt(limit);
  const S = BigInt(spent);
  const SERATUS = BigInt(100);
  const status: BudgetStatus =
    S > L ? "terlampaui" : S * SERATUS >= L * BigInt(BUDGET_WARNING_PERCENT) ? "hampir" : "aman";

  return {
    limit,
    spent,
    remaining: addAmounts(limit, -spent),
    percent: Number((S * SERATUS) / L),
    status,
  };
}

export type ExpenseRow = { category_id: string | null; type: string; amount: number };

// Total pengeluaran per kategori (hanya baris bertipe expense).
export function expenseByCategory(rows: ExpenseRow[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const r of rows) {
    if (r.type !== "expense" || !r.category_id) continue;
    totals.set(r.category_id, addAmounts(totals.get(r.category_id) ?? 0, r.amount));
  }
  return totals;
}

// Pemakaian budget satu kategori: kategori itu sendiri + sub-kategorinya.
export function budgetSpent(
  categoryId: string,
  totals: Map<string, number>,
  categories: { id: string; parent_id: string | null }[],
): number {
  const ids = [categoryId, ...categories.filter((c) => c.parent_id === categoryId).map((c) => c.id)];
  return ids.reduce((sum, id) => addAmounts(sum, totals.get(id) ?? 0), 0);
}

const STATUS_URUT: Record<BudgetStatus, number> = { terlampaui: 0, hampir: 1, aman: 2 };

// Hitung jumlah budget yang perlu perhatian (untuk ringkasan di Beranda).
export function countBudgetAlerts(usages: { status: BudgetStatus }[]) {
  return {
    hampir: usages.filter((u) => u.status === "hampir").length,
    terlampaui: usages.filter((u) => u.status === "terlampaui").length,
  };
}

// Urutkan: terlampaui dulu, lalu hampir habis, lalu aman.
export function compareBudgetStatus(a: BudgetStatus, b: BudgetStatus) {
  return STATUS_URUT[a] - STATUS_URUT[b];
}
