import "server-only";

import { categoryOptions } from "@/lib/categories/options";
import { lastMonths, monthRange, type Period } from "@/lib/dates";
import {
  expenseBreakdown,
  monthlyTrend,
  summarizeIncomeExpense,
  totalBalance,
  type ReportRow,
} from "@/lib/money";
import { fetchAllPages } from "@/lib/supabase/paginate";
import type { createClient } from "@/lib/supabase/server";
import { loadAccountBalances } from "@/lib/transactions/balances";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export const BULAN_TREN = 6;

function loadReportRows(supabase: Supabase, start: string, end: string) {
  return fetchAllPages<ReportRow>((from, to) =>
    supabase
      .from("transactions")
      .select("type, amount, category_id, occurred_on")
      .in("type", ["income", "expense"])
      .gte("occurred_on", start)
      .lt("occurred_on", end)
      .order("id")
      .range(from, to),
  );
}

export async function loadDashboard(supabase: Supabase, period: Period) {
  // Tren: 6 bulan yang berakhir di bulan akhir periode.
  const months = lastMonths(period.to.slice(0, 7), BULAN_TREN);
  const trendStart = monthRange(months[0]!).start;
  const trendEnd = monthRange(months.at(-1)!).end;

  const [periodRows, trendRows, categoriesRes, accountsRes] = await Promise.all([
    loadReportRows(supabase, period.start, period.end),
    loadReportRows(supabase, trendStart, trendEnd),
    supabase.from("categories").select("id, parent_id, name, type, archived_at"),
    supabase.from("accounts").select("id, opening_balance, archived_at"),
  ]);
  const accounts = accountsRes.data ?? [];
  const balances = await loadAccountBalances(supabase, accounts);

  const error = periodRows.error ?? trendRows.error ?? categoriesRes.error ?? accountsRes.error ?? balances.error;
  if (error) console.error("[dashboard] muat gagal", { code: error.code });

  const categories = categoriesRes.data ?? [];
  const labels = new Map(categoryOptions(categories).map((c) => [c.value, c.label]));
  const breakdown = expenseBreakdown(periodRows.rows, categories);

  return {
    error,
    summary: summarizeIncomeExpense(periodRows.rows.map((r) => ({ type: r.type === "income" ? "income" : "expense", amount: r.amount }))),
    breakdown: {
      total: breakdown.total,
      items: breakdown.items.map((i) => ({
        ...i,
        label: i.categoryId ? (labels.get(i.categoryId) ?? "(kategori tidak ditemukan)") : "Kategori lain",
      })),
    },
    trend: monthlyTrend(trendRows.rows, months),
    // Total saldo semua akun aktif (null jika gagal dihitung, bukan angka yang salah).
    totalSaldo: balances.balances
      ? totalBalance(accounts.filter((a) => !a.archived_at).map((a) => balances.balances.get(a.id) ?? 0))
      : null,
  };
}
