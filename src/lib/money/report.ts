import { addAmounts } from "./balance";

export type ReportRow = { type: string; amount: number; category_id: string | null; occurred_on: string };

export type BreakdownItem = {
  categoryId: string | null; // null = gabungan "Kategori lain"
  amount: number;
  percent: number; // persen bulat ke bawah dari total pengeluaran
};

// Persen bulat ke bawah dengan BigInt (tanpa float).
export function percentOf(part: number, total: number): number {
  if (total <= 0) return 0;
  return Number((BigInt(part) * BigInt(100)) / BigInt(total));
}

// Pengeluaran per kategori utama (sub-kategori digabung ke induknya), terbesar dulu.
// Lebih dari `maxItems` kategori digabung menjadi satu baris "Kategori lain".
export function expenseBreakdown(
  rows: ReportRow[],
  categories: { id: string; parent_id: string | null }[],
  maxItems = 6,
): { total: number; items: BreakdownItem[] } {
  const parent = new Map(categories.map((c) => [c.id, c.parent_id]));
  const totals = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    if (r.type !== "expense" || !r.category_id) continue;
    const root = parent.get(r.category_id) ?? r.category_id;
    totals.set(root, addAmounts(totals.get(root) ?? 0, r.amount));
    total = addAmounts(total, r.amount);
  }

  const sorted = [...totals].sort((a, b) => b[1] - a[1]);
  const head = sorted.length > maxItems ? sorted.slice(0, maxItems - 1) : sorted;
  const tail = sorted.slice(head.length);

  const items: BreakdownItem[] = head.map(([categoryId, amount]) => ({ categoryId, amount, percent: percentOf(amount, total) }));
  if (tail.length > 0) {
    const sisa = tail.reduce((s, [, a]) => addAmounts(s, a), 0);
    items.push({ categoryId: null, amount: sisa, percent: percentOf(sisa, total) });
  }
  return { total, items };
}

export type TrendPoint = { month: string; income: number; expense: number };

// Pemasukan & pengeluaran per bulan (transfer tidak dihitung). Bulan tanpa transaksi bernilai 0.
export function monthlyTrend(rows: ReportRow[], months: string[]): TrendPoint[] {
  const byMonth = new Map(months.map((m) => [m, { month: m, income: 0, expense: 0 }]));
  for (const r of rows) {
    const point = byMonth.get(r.occurred_on.slice(0, 7));
    if (!point) continue;
    if (r.type === "income") point.income = addAmounts(point.income, r.amount);
    else if (r.type === "expense") point.expense = addAmounts(point.expense, r.amount);
  }
  return months.map((m) => byMonth.get(m)!);
}
