"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { allocateToGoal } from "@/lib/goals/allocate";
import { loadActiveAllocations } from "@/lib/goals/query";
import { allocationTotals, canRemoveAllocation } from "@/lib/money";
import { idSchema } from "@/lib/validators/common";
import { goalAllocationSchema } from "@/lib/validators/goal";

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

// Sisihkan (+) atau ambil (−) tabungan tujuan dari/ke satu akun (lihat allocateToGoal).
export async function saveAllocation(goalId: string, _prev: AllocationFormState, formData: FormData): Promise<AllocationFormState> {
  const values = bacaForm(formData);
  const parsed = goalAllocationSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  if (!idSchema.safeParse(goalId).success) return { error: GAGAL, values };

  const { supabase } = await requireUser();
  const gagal = await allocateToGoal(supabase, { goalId, ...parsed.data });
  if (gagal) return gagal.field ? { fieldErrors: { [gagal.field]: [gagal.message] }, values } : { error: gagal.message, values };
  selesai(goalId, parsed.data.kind === "ambil" ? "diambil" : "disisihkan");
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
