import "server-only";

import { buildCategoryTree, type CategoryItem } from "@/lib/categories/tree";
import { monthRange, shiftMonth } from "@/lib/dates";
import {
  budgetSpent,
  budgetUsage,
  compareBudgetStatus,
  expenseByCategory,
  type BudgetUsage,
  type ExpenseRow,
} from "@/lib/money";
import { fetchAllPages } from "@/lib/supabase/paginate";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type BudgetItem = { id: string; categoryId: string; label: string; usage: BudgetUsage };

// "2026-10" -> "2026-10-01" (format kolom budgets.month)
export const monthToDate = (month: string) => `${month}-01`;

// Label kategori "Induk › Anak" untuk semua kategori pengeluaran (termasuk yang diarsipkan).
function expenseLabels(categories: CategoryItem[]) {
  const labels = new Map<string, string>();
  for (const root of buildCategoryTree(categories, "expense")) {
    labels.set(root.id, root.name);
    for (const c of root.children) labels.set(c.id, `${root.name} › ${c.name}`);
  }
  return labels;
}

export async function loadMonthBudgets(supabase: Supabase, month: string) {
  const { start, end } = monthRange(month);
  const [categoriesRes, budgetsRes, prevRes, expenses] = await Promise.all([
    supabase.from("categories").select("id, parent_id, name, type, archived_at"),
    supabase.from("budgets").select("id, category_id, amount").eq("month", monthToDate(month)),
    supabase.from("budgets").select("category_id").eq("month", monthToDate(shiftMonth(month, -1))),
    fetchAllPages<ExpenseRow>((from, to) =>
      supabase
        .from("transactions")
        .select("category_id, type, amount")
        .eq("type", "expense")
        .gte("occurred_on", start)
        .lt("occurred_on", end)
        .order("id")
        .range(from, to),
    ),
  ]);

  const error = categoriesRes.error ?? budgetsRes.error ?? prevRes.error ?? expenses.error;
  if (error) {
    console.error("[budgets] muat gagal", { code: error.code });
    return { items: [], copyable: 0, error };
  }

  const categories = categoriesRes.data ?? [];
  const labels = expenseLabels(categories);
  const totals = expenseByCategory(expenses.rows);

  const items: BudgetItem[] = (budgetsRes.data ?? [])
    .map((b) => ({
      id: b.id,
      categoryId: b.category_id,
      label: labels.get(b.category_id) ?? "(kategori tidak ditemukan)",
      usage: budgetUsage(b.amount, budgetSpent(b.category_id, totals, categories)),
    }))
    .sort((a, b) => compareBudgetStatus(a.usage.status, b.usage.status) || a.label.localeCompare(b.label, "id"));

  // Budget bulan lalu yang belum ada di bulan ini (untuk tombol "Salin dari bulan lalu").
  const sudahAda = new Set(items.map((i) => i.categoryId));
  const aktif = new Set(categories.filter((c) => !c.archived_at).map((c) => c.id));
  const copyable = (prevRes.data ?? []).filter((p) => !sudahAda.has(p.category_id) && aktif.has(p.category_id)).length;

  return { items, copyable, error: null };
}

// Pilihan kategori pengeluaran aktif yang belum punya budget di bulan ini.
export async function loadBudgetCategoryOptions(supabase: Supabase, month: string) {
  const [categoriesRes, budgetsRes] = await Promise.all([
    supabase.from("categories").select("id, parent_id, name, type, archived_at").is("archived_at", null),
    supabase.from("budgets").select("category_id").eq("month", monthToDate(month)),
  ]);
  const terpakai = new Set((budgetsRes.data ?? []).map((b) => b.category_id));
  const labels = expenseLabels(categoriesRes.data ?? []);
  return [...labels].filter(([id]) => !terpakai.has(id)).map(([value, label]) => ({ value, label }));
}
