import "server-only";

import type { createClient } from "@/lib/supabase/server";

import type { ChecklistInput } from "./checklist";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Jumlah data untuk checklist "Mulai di sini" (hanya dimuat selama checklist tampil).
export async function loadChecklistCounts(supabase: Supabase, budgetsThisMonth: number): Promise<ChecklistInput | null> {
  const hitung = (t: "accounts" | "transactions" | "recurring_rules" | "goals") =>
    supabase.from(t).select("id", { count: "exact", head: true });
  const [akun, transaksi, jadwal, tujuan] = await Promise.all([hitung("accounts"), hitung("transactions"), hitung("recurring_rules"), hitung("goals")]);
  const error = akun.error ?? transaksi.error ?? jadwal.error ?? tujuan.error;
  if (error) {
    console.error("[onboarding] checklist gagal", { code: error.code });
    return null;
  }
  return {
    accounts: akun.count ?? 0,
    transactions: transaksi.count ?? 0,
    budgetsThisMonth,
    recurringRules: jadwal.count ?? 0,
    goals: tujuan.count ?? 0,
  };
}
