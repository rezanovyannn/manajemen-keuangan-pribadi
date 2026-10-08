import "server-only";

import {
  accountSplit,
  allocationTotals,
  goalProgress,
  monthlyNeeded,
  type AccountSplit,
  type AllocationRow,
  type GoalProgress,
  type MonthlyNeed,
} from "@/lib/money";
import { fetchAllPages } from "@/lib/supabase/paginate";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type GoalItem = {
  id: string;
  name: string;
  deadline: string | null;
  progress: GoalProgress;
  need: MonthlyNeed;
  // Rincian tabungan per akun asal (hanya yang tidak nol).
  perAccount: { accountId: string; accountName: string; amount: number }[];
};

// Tujuan aktif + semua setoran milik tujuan aktif (setoran tujuan yang diarsipkan tidak
// dihitung sebagai uang yang disisihkan).
export async function loadActiveAllocations(supabase: Supabase) {
  const [goalsRes, rows] = await Promise.all([
    supabase.from("goals").select("id, name, target_amount, deadline").is("archived_at", null).order("created_at"),
    fetchAllPages<AllocationRow>((from, to) =>
      supabase.from("goal_allocations").select("goal_id, account_id, amount").order("id").range(from, to),
    ),
  ]);
  const error = goalsRes.error ?? rows.error;
  if (error) console.error("[goals] muat setoran gagal", { code: error.code });
  const goals = goalsRes.data ?? [];
  const aktif = new Set(goals.map((g) => g.id));
  return { goals, rows: rows.rows.filter((r) => aktif.has(r.goal_id)), error };
}

// Tujuan aktif beserta progress (dari setoran) dan setoran per bulan yang dibutuhkan.
export async function loadGoals(supabase: Supabase, today: string) {
  const [alloc, accountsRes] = await Promise.all([
    loadActiveAllocations(supabase),
    supabase.from("accounts").select("id, name").order("created_at"),
  ]);
  const error = alloc.error ?? accountsRes.error;
  if (error) return { items: [] as GoalItem[], error };

  const nama = new Map((accountsRes.data ?? []).map((a) => [a.id, a.name]));
  const totals = allocationTotals(alloc.rows);
  const items: GoalItem[] = alloc.goals.map((g) => {
    const progress = goalProgress(g.target_amount, totals.byGoal.get(g.id) ?? 0);
    const akun = [...new Set(alloc.rows.filter((r) => r.goal_id === g.id).map((r) => r.account_id))];
    return {
      id: g.id,
      name: g.name,
      deadline: g.deadline,
      progress,
      need: monthlyNeeded(progress.remaining, today, g.deadline),
      perAccount: akun
        .map((accountId) => ({ accountId, accountName: nama.get(accountId) ?? "(akun tidak ditemukan)", amount: totals.goalAccount(g.id, accountId) }))
        .filter((a) => a.amount !== 0),
    };
  });
  return { items, error: null };
}

export type AccountSavings = AccountSplit & { goals: { goalId: string; name: string; amount: number }[] };

// Per akun: tabungan per tujuan dan sisa bebas dipakai. `balances` = saldo akun yang
// sudah dihitung halaman (agar riwayat transaksi tidak dimuat dua kali).
export async function loadAccountSavings(supabase: Supabase, accounts: { id: string }[], balances: Map<string, number>) {
  const alloc = await loadActiveAllocations(supabase);
  if (alloc.error) return { byAccount: null, error: alloc.error };

  const totals = allocationTotals(alloc.rows);
  const byAccount = new Map<string, AccountSavings>();
  for (const a of accounts) {
    const goals = alloc.goals
      .map((g) => ({ goalId: g.id, name: g.name, amount: totals.goalAccount(g.id, a.id) }))
      .filter((g) => g.amount !== 0);
    if (goals.length === 0) continue;
    byAccount.set(a.id, { ...accountSplit(balances.get(a.id) ?? 0, totals.byAccount.get(a.id) ?? 0), goals });
  }
  return { byAccount, error: null };
}

// Riwayat setoran satu tujuan (terbaru dulu) untuk halaman detail.
export async function loadGoalHistory(supabase: Supabase, goalId: string) {
  const { data, error } = await supabase
    .from("goal_allocations")
    .select("id, account_id, amount, occurred_on, note")
    .eq("goal_id", goalId)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) console.error("[goals] riwayat gagal", { code: error.code });
  return { rows: data ?? [], error };
}
