import "server-only";

import { buildCategoryTree, type CategoryItem } from "@/lib/categories/tree";
import { monthRange, shiftMonth } from "@/lib/dates";
import {
  budgetSpent,
  budgetTimeline,
  budgetUsage,
  compareBudgetStatus,
  expenseByCategory,
  type BudgetTimelineItem,
  type BudgetUsage,
  type ExpenseRow,
} from "@/lib/money";
import { fetchAllPages } from "@/lib/supabase/paginate";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type DetailRow = ExpenseRow & { id: string; occurred_on: string; note: string | null };

export type BudgetDetail = BudgetTimelineItem<{ id: string; amount: number; occurredOn: string; label: string; note: string | null }>;

export type BudgetItem = {
  id: string;
  categoryId: string;
  // Kategori budget + sub-kategorinya.
  categoryIds: string[];
  label: string;
  usage: BudgetUsage;
  // Rincian transaksi kategori ini (urut tanggal) dengan total berjalan.
  details: BudgetDetail[];
  warnDate: string | null; // tanggal mulai hampir habis (>= 80%)
  overDate: string | null; // tanggal mulai terlampaui
};

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
    fetchAllPages<DetailRow>((from, to) =>
      supabase
        .from("transactions")
        .select("id, category_id, type, amount, occurred_on, note")
        .eq("type", "expense")
        .gte("occurred_on", start)
        .lt("occurred_on", end)
        // Urutan stabil: tanggal, lalu waktu dibuat, lalu id (juga dipakai total berjalan).
        .order("occurred_on")
        .order("created_at")
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
    .map((b) => {
      // Kategori budget + sub-kategorinya (sama seperti perhitungan pemakaian).
      const ids = new Set([b.category_id, ...categories.filter((c) => c.parent_id === b.category_id).map((c) => c.id)]);
      const rows = expenses.rows
        .filter((r) => r.category_id !== null && ids.has(r.category_id))
        .map((r) => ({
          id: r.id,
          amount: r.amount,
          occurredOn: r.occurred_on,
          note: r.note,
          label: (r.category_id && labels.get(r.category_id)) || "",
        }));
      const timeline = budgetTimeline(b.amount, rows);
      const tanggal = (id: string | null) => timeline.items.find((i) => i.id === id)?.occurredOn ?? null;
      return {
        id: b.id,
        categoryId: b.category_id,
        categoryIds: [...ids],
        label: labels.get(b.category_id) ?? "(kategori tidak ditemukan)",
        usage: budgetUsage(b.amount, budgetSpent(b.category_id, totals, categories)),
        details: timeline.items,
        warnDate: tanggal(timeline.warnId),
        overDate: tanggal(timeline.overId),
      };
    })
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
