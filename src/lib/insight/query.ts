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

type GoalTarget = { accountId: string; target: number };

// Tujuan tabungan aktif: akun + target (satu tujuan aktif per akun).
async function loadGoalTargets(supabase: Supabase) {
  const { data, error } = await supabase.from("goals").select("account_id, target_amount").is("archived_at", null);
  if (error) console.error("[insight] muat tujuan gagal", { code: error.code });
  return { goals: (data ?? []).map((g): GoalTarget => ({ accountId: g.account_id, target: g.target_amount })), error };
}

// Saldo akun tujuan + target (hanya akun aktif, karena saldo total juga hanya akun aktif).
function saldoTujuan(goals: GoalTarget[], balances: { id: string; balance: number }[]) {
  const saldo = new Map(balances.map((b) => [b.id, b.balance]));
  return goals.flatMap((g) => (saldo.has(g.accountId) ? [{ ...g, balance: saldo.get(g.accountId)! }] : []));
}

const cadanganBudget = (items: BudgetItem[]) => items.map((b) => ({ categoryIds: b.categoryIds, remaining: b.usage.remaining }));

// Untuk kartu di Beranda: saldo & budget sudah dimuat halaman, cukup ambil jadwal
// dan akun tujuan (dimuat paralel dengan data Beranda lain).
export async function loadMonthRules(supabase: Supabase) {
  const monthEnd = monthEndInJakarta();
  const [rules, goals] = await Promise.all([loadRules(supabase, monthEnd), loadGoalTargets(supabase)]);
  return { monthEnd, rules: rules.rules, goals: goals.goals, error: rules.error ?? goals.error };
}

// null jika salah satu data gagal dimuat (lebih baik tidak tampil daripada angka yang salah).
export function buildSafeToSpend(input: {
  today: string;
  totalSaldo: number | null;
  // Saldo per akun aktif (null jika gagal dihitung).
  accountBalances: { id: string; balance: number }[] | null;
  budgets: { items: BudgetItem[]; error: unknown };
  rules: Awaited<ReturnType<typeof loadMonthRules>>;
}) {
  const { today, totalSaldo, accountBalances, budgets, rules } = input;
  if (rules.error || totalSaldo === null || accountBalances === null || budgets.error) return null;
  return safeToSpend({
    balance: totalSaldo,
    goalAccounts: saldoTujuan(rules.goals, accountBalances),
    occurrences: upcomingOccurrences(rules.rules, today, rules.monthEnd),
    budgets: cadanganBudget(budgets.items),
    today,
    monthEnd: rules.monthEnd,
  });
}

// Halaman Insight: proyeksi saldo sampai akhir bulan + aman dibelanjakan.
export async function loadProjection(supabase: Supabase, today: string) {
  const monthEnd = monthEndInJakarta();
  const [accountsRes, rulesRes, budgets, goals] = await Promise.all([
    supabase.from("accounts").select("id, name, opening_balance, archived_at").is("archived_at", null).order("created_at"),
    loadRules(supabase, monthEnd),
    loadMonthBudgets(supabase, currentMonthInJakarta()),
    loadGoalTargets(supabase),
  ]);
  const accounts = accountsRes.data ?? [];
  const balances = await loadAccountBalances(supabase, accounts);
  const error = accountsRes.error ?? rulesRes.error ?? budgets.error ?? goals.error ?? balances.error;
  if (error || !balances.balances) {
    if (accountsRes.error) console.error("[insight] muat akun gagal", { code: accountsRes.error.code });
    return { error: true as const };
  }

  const saldo = accounts.map((a) => ({ id: a.id, balance: balances.balances.get(a.id) ?? 0 }));
  const occurrences = upcomingOccurrences(rulesRes.rules, today, monthEnd);
  const projection = projectCashflow({ accounts: saldo, occurrences, today, until: monthEnd });
  const safe = safeToSpend({
    balance: projection.start,
    goalAccounts: saldoTujuan(goals.goals, saldo),
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
