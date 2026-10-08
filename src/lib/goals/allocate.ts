import "server-only";

import { allocationTotals, checkAllocation, computeBalance, type AllocationKind, type BalanceTransaction } from "@/lib/money";
import { fetchAllPages } from "@/lib/supabase/paginate";
import type { createClient } from "@/lib/supabase/server";

import { loadActiveAllocations } from "./query";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type AllocateInput = {
  goalId: string;
  kind: AllocationKind;
  accountId: string;
  amount: number;
  occurredOn: string;
  note: string | null;
};

// Hasil: null = tersimpan; selain itu pesan galat (field = isian yang salah, jika ada).
export type AllocateError = { message: string; field?: "accountId" | "amount" };

const GAGAL = "Tabungan gagal disimpan. Silakan coba lagi.";

// Saldo satu akun = saldo awal + transaksinya (aturan sama dengan src/lib/money/balance.ts).
async function saldoAkun(supabase: Supabase, accountId: string, openingBalance: number) {
  const { rows, error } = await fetchAllPages<BalanceTransaction>((from, to) =>
    supabase.from("transactions").select("account_id, type, amount").eq("account_id", accountId).order("id").range(from, to),
  );
  return error ? null : computeBalance(openingBalance, rows);
}

// Sisihkan (+) atau ambil (−) tabungan tujuan dari/ke satu akun, dengan batas:
// sisihkan <= saldo bebas akun, ambil <= tabungan tujuan dari akun itu.
// RLS menjamin tujuan/akun milik pengguna lain tidak ditemukan.
export async function allocateToGoal(supabase: Supabase, d: AllocateInput): Promise<AllocateError | null> {
  const [goalRes, accountRes, alloc] = await Promise.all([
    supabase.from("goals").select("id").eq("id", d.goalId).is("archived_at", null).maybeSingle(),
    supabase.from("accounts").select("id, opening_balance, archived_at").eq("id", d.accountId).maybeSingle(),
    loadActiveAllocations(supabase),
  ]);
  if (goalRes.error || accountRes.error || alloc.error) {
    console.error("[goals] setoran: muat gagal", { code: (goalRes.error ?? accountRes.error ?? alloc.error)?.code });
    return { message: GAGAL };
  }
  if (!goalRes.data) return { message: "Tujuan tidak ditemukan atau sudah diarsipkan." };
  const akun = accountRes.data;
  if (!akun || (d.kind === "sisihkan" && akun.archived_at)) return { message: "Pilih akun yang aktif.", field: "accountId" };

  const saldo = await saldoAkun(supabase, akun.id, akun.opening_balance);
  if (saldo === null) return { message: GAGAL };
  const totals = allocationTotals(alloc.rows);
  const pesan = checkAllocation(d.amount, {
    kind: d.kind,
    balance: saldo,
    accountAllocated: totals.byAccount.get(akun.id) ?? 0,
    goalAccountAllocated: totals.goalAccount(d.goalId, akun.id),
  });
  if (pesan) return { message: pesan, field: "amount" };

  const { error } = await supabase.from("goal_allocations").insert({
    goal_id: d.goalId,
    account_id: akun.id,
    amount: d.kind === "ambil" ? -d.amount : d.amount,
    occurred_on: d.occurredOn,
    note: d.note,
  });
  if (error) {
    console.error("[goals] setoran: simpan gagal", { code: error.code });
    return { message: GAGAL };
  }
  return null;
}
