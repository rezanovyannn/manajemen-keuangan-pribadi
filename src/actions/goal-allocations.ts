"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { loadActiveAllocations } from "@/lib/goals/query";
import { allocationTotals, canRemoveAllocation, checkAllocation, computeBalance, type BalanceTransaction } from "@/lib/money";
import { fetchAllPages } from "@/lib/supabase/paginate";
import type { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validators/common";
import { goalAllocationSchema } from "@/lib/validators/goal";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type AllocationFormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};

const FIELDS = ["kind", "accountId", "amount", "occurredOn", "note"] as const;
const GAGAL = "Tabungan gagal disimpan. Silakan coba lagi.";

function bacaForm(formData: FormData) {
  return Object.fromEntries(
    FIELDS.map((k) => {
      const v = formData.get(k);
      return [k, typeof v === "string" ? v : ""];
    }),
  ) as Record<(typeof FIELDS)[number], string>;
}

function selesai(goalId: string, status: string): never {
  for (const p of ["/tujuan", `/tujuan/${goalId}`, "/akun", "/beranda", "/insight"]) revalidatePath(p);
  redirect(`/tujuan/${goalId}?status=${status}`);
}

// Saldo satu akun = saldo awal + transaksinya (aturan sama dengan src/lib/money/balance.ts).
async function saldoAkun(supabase: Supabase, accountId: string, openingBalance: number) {
  const { rows, error } = await fetchAllPages<BalanceTransaction>((from, to) =>
    supabase.from("transactions").select("account_id, type, amount").eq("account_id", accountId).order("id").range(from, to),
  );
  return error ? null : computeBalance(openingBalance, rows);
}

// Sisihkan (+) atau ambil (−) tabungan tujuan dari/ke satu akun. Tidak ada uang yang
// berpindah; batasnya: sisihkan <= saldo bebas akun, ambil <= tabungan tujuan dari akun itu.
export async function saveAllocation(goalId: string, _prev: AllocationFormState, formData: FormData): Promise<AllocationFormState> {
  const values = bacaForm(formData);
  const parsed = goalAllocationSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  if (!idSchema.safeParse(goalId).success) return { error: GAGAL, values };
  const { kind, accountId, amount, occurredOn, note } = parsed.data;

  const { supabase } = await requireUser();
  // RLS: tujuan/akun milik pengguna lain tidak akan ditemukan.
  const [goalRes, accountRes, alloc] = await Promise.all([
    supabase.from("goals").select("id").eq("id", goalId).is("archived_at", null).maybeSingle(),
    supabase.from("accounts").select("id, opening_balance, archived_at").eq("id", accountId).maybeSingle(),
    loadActiveAllocations(supabase),
  ]);
  if (goalRes.error || accountRes.error || alloc.error) {
    console.error("[goals] setoran: muat gagal", { code: (goalRes.error ?? accountRes.error ?? alloc.error)?.code });
    return { error: GAGAL, values };
  }
  if (!goalRes.data) return { error: "Tujuan tidak ditemukan atau sudah diarsipkan.", values };
  const akun = accountRes.data;
  if (!akun || (kind === "sisihkan" && akun.archived_at)) return { fieldErrors: { accountId: ["Pilih akun yang aktif."] }, values };

  const saldo = await saldoAkun(supabase, akun.id, akun.opening_balance);
  if (saldo === null) return { error: GAGAL, values };
  const totals = allocationTotals(alloc.rows);
  const pesan = checkAllocation(amount, {
    kind,
    balance: saldo,
    accountAllocated: totals.byAccount.get(akun.id) ?? 0,
    goalAccountAllocated: totals.goalAccount(goalId, akun.id),
  });
  if (pesan) return { fieldErrors: { amount: [pesan] }, values };

  const { error } = await supabase.from("goal_allocations").insert({
    goal_id: goalId,
    account_id: akun.id,
    amount: kind === "ambil" ? -amount : amount,
    occurred_on: occurredOn,
    note,
  });
  if (error) {
    console.error("[goals] setoran: simpan gagal", { code: error.code });
    return { error: GAGAL, values };
  }
  selesai(goalId, kind === "ambil" ? "diambil" : "disisihkan");
}

// Hapus satu baris riwayat. Ditolak jika membuat tabungan tujuan dari akun itu minus
// (misalnya menghapus setoran yang sebagian sudah diambil).
export async function deleteAllocation(goalId: string, allocationId: string) {
  if (!idSchema.safeParse(goalId).success || !idSchema.safeParse(allocationId).success) redirect("/tujuan");
  const { supabase } = await requireUser();
  const [rowRes, alloc] = await Promise.all([
    supabase.from("goal_allocations").select("id, account_id, amount").eq("id", allocationId).eq("goal_id", goalId).maybeSingle(),
    loadActiveAllocations(supabase),
  ]);
  if (rowRes.error || alloc.error || !rowRes.data) selesai(goalId, "gagal");
  const row = rowRes.data;
  if (!canRemoveAllocation(allocationTotals(alloc.rows).goalAccount(goalId, row.account_id), row.amount)) {
    selesai(goalId, "tidak-bisa-hapus");
  }
  const { error } = await supabase.from("goal_allocations").delete().eq("id", row.id);
  if (error) console.error("[goals] setoran: hapus gagal", { code: error.code });
  selesai(goalId, error ? "gagal" : "riwayat-dihapus");
}
