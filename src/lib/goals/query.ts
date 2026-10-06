import "server-only";

import { goalProgress, monthlyNeeded, type GoalProgress, type MonthlyNeed } from "@/lib/money";
import type { createClient } from "@/lib/supabase/server";
import { loadAccountBalances } from "@/lib/transactions/balances";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type GoalItem = {
  id: string;
  name: string;
  accountId: string;
  accountName: string;
  deadline: string | null;
  progress: GoalProgress;
  need: MonthlyNeed;
};

// Tujuan aktif beserta progress (saldo akun terhubung) dan setoran per bulan yang dibutuhkan.
export async function loadGoals(supabase: Supabase, today: string) {
  const [goalsRes, accountsRes] = await Promise.all([
    supabase.from("goals").select("id, name, account_id, target_amount, deadline").is("archived_at", null).order("created_at"),
    supabase.from("accounts").select("id, name, opening_balance, archived_at").order("created_at"),
  ]);
  const accounts = accountsRes.data ?? [];
  const balances = await loadAccountBalances(supabase, accounts);
  const error = goalsRes.error ?? accountsRes.error ?? balances.error;
  if (error) {
    console.error("[goals] muat gagal", { code: error.code });
    return { items: [] as GoalItem[], accounts, error };
  }

  const nama = new Map(accounts.map((a) => [a.id, a.name]));
  const items: GoalItem[] = (goalsRes.data ?? []).map((g) => {
    const progress = goalProgress(g.target_amount, balances.balances?.get(g.account_id) ?? 0);
    return {
      id: g.id,
      name: g.name,
      accountId: g.account_id,
      accountName: nama.get(g.account_id) ?? "(akun tidak ditemukan)",
      deadline: g.deadline,
      progress,
      need: monthlyNeeded(progress.remaining, today, g.deadline),
    };
  });
  return { items, accounts, error: null };
}
