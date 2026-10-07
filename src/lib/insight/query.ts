import "server-only";

import type { BudgetItem } from "@/lib/budgets/query";
import { loadMonthBudgets } from "@/lib/budgets/query";
import { addDays, currentMonthInJakarta, monthRange } from "@/lib/dates";
import { projectCashflow, safeToSpend, upcomingOccurrences, type ProjectionRule } from "@/lib/money";
import type { createClient } from "@/lib/supabase/server";
import { loadAccountBalances } from "@/lib/transactions/balances";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Tanggal terakhir bulan berjalan (zona Jakarta).
export function monthEndInJakarta(now: Date = new Date()) {
  return addDays(monthRange(currentMonthInJakarta(now)).end, -1);
}

async function loadRules(supabase: Supabase, until: string) {
  const { data, error } = await supabase
    .from("recurring_rules")
    .select("id, name, type, amount, account_id, category_id, frequency, start_date, end_date, next_due_date, paused")
    .eq("paused", false)
    .lte("next_due_date", until);
  if (error) console.error("[insight] muat jadwal gagal", { code: error.code });
  return { rules: (data ?? []) as ProjectionRule[], error };
}

const cadanganBudget = (items: BudgetItem[]) => items.map((b) => ({ categoryIds: b.categoryIds, remaining: b.usage.remaining }));

// Untuk kartu di Beranda: saldo & budget sudah dimuat halaman, cukup ambil jadwal
// (dimuat paralel dengan data Beranda lain).
export async function loadMonthRules(supabase: Supabase) {
  const monthEnd = monthEndInJakarta();
  return { monthEnd, ...(await loadRules(supabase, monthEnd)) };
}

// null jika salah satu data gagal dimuat (lebih baik tidak tampil daripada angka yang salah).
export function buildSafeToSpend(input: {
  today: string;
  totalSaldo: number | null;
  budgets: { items: BudgetItem[]; error: unknown };
  rules: Awaited<ReturnType<typeof loadMonthRules>>;
}) {
  const { today, totalSaldo, budgets, rules } = input;
  if (rules.error || totalSaldo === null || budgets.error) return null;
  return safeToSpend({
    balance: totalSaldo,
    occurrences: upcomingOccurrences(rules.rules, today, rules.monthEnd),
    budgets: cadanganBudget(budgets.items),
    today,
    monthEnd: rules.monthEnd,
  });
}

// Halaman Insight: proyeksi saldo sampai akhir bulan + aman dibelanjakan.
export async function loadProjection(supabase: Supabase, today: string) {
  const monthEnd = monthEndInJakarta();
  const [accountsRes, rulesRes, budgets] = await Promise.all([
    supabase.from("accounts").select("id, name, opening_balance, archived_at").is("archived_at", null).order("created_at"),
    loadRules(supabase, monthEnd),
    loadMonthBudgets(supabase, currentMonthInJakarta()),
  ]);
  const accounts = accountsRes.data ?? [];
  const balances = await loadAccountBalances(supabase, accounts);
  const error = accountsRes.error ?? rulesRes.error ?? budgets.error ?? balances.error;
  if (error || !balances.balances) {
    if (accountsRes.error) console.error("[insight] muat akun gagal", { code: accountsRes.error.code });
    return { error: true as const };
  }

  const saldo = accounts.map((a) => ({ id: a.id, balance: balances.balances.get(a.id) ?? 0 }));
  const occurrences = upcomingOccurrences(rulesRes.rules, today, monthEnd);
  const projection = projectCashflow({ accounts: saldo, occurrences, today, until: monthEnd });
  const safe = safeToSpend({
    balance: projection.start,
    occurrences,
    budgets: cadanganBudget(budgets.items),
    today,
    monthEnd,
  });
  return {
    error: false as const,
    monthEnd,
    projection,
    safe,
    accountNames: Object.fromEntries(accounts.map((a) => [a.id, a.name])) as Record<string, string>,
    hasRules: rulesRes.rules.length > 0,
  };
}
