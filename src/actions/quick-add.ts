"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { loadQuickAddData } from "@/lib/quick-add/query";
import { idSchema } from "@/lib/validators/common";
import { transactionSchema } from "@/lib/validators/transaction";

export type QuickAddResult = { ok: true; id: string } | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

const GAGAL = "Transaksi gagal disimpan. Silakan coba lagi.";

function segarkan() {
  for (const p of ["/beranda", "/transaksi", "/akun", "/budget", "/insight", "/tujuan"]) revalidatePath(p);
}

// Data untuk panel Catat kilat (dimuat saat panel dibuka).
export async function getQuickAddData() {
  const { supabase } = await requireUser();
  return loadQuickAddData(supabase);
}

const inputSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z.string(),
  accountId: z.string(),
  categoryId: z.string(),
  occurredOn: z.string(),
  note: z.string().max(500),
});

// Simpan pemasukan/pengeluaran tanpa pindah halaman. Validasi sama dengan form lengkap.
export async function quickAddTransaction(input: unknown): Promise<QuickAddResult> {
  const raw = inputSchema.safeParse(input);
  if (!raw.success) return { ok: false, error: GAGAL };
  const parsed = transactionSchema.safeParse(raw.data);
  if (!parsed.success) return { ok: false, error: "Periksa isian.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const d = parsed.data;
  if (d.type === "transfer") return { ok: false, error: GAGAL };

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      type: d.type,
      account_id: d.accountId,
      category_id: d.categoryId,
      amount: d.amount,
      occurred_on: d.occurredOn,
      note: d.note,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error) console.error("[catat-kilat] simpan gagal", { code: error.code });
    return { ok: false, error: error?.code === "23503" ? "Akun atau kategori tidak valid." : GAGAL };
  }
  segarkan();
  return { ok: true, id: data.id };
}

// "Batalkan" dari toast: hapus transaksi yang baru dicatat (bukan transfer/biaya admin).
export async function undoQuickAdd(id: string): Promise<{ ok: boolean }> {
  if (!idSchema.safeParse(id).success) return { ok: false };
  const { supabase } = await requireUser();
  const { error, count } = await supabase
    .from("transactions")
    .delete({ count: "exact" })
    .eq("id", id)
    .in("type", ["expense", "income"])
    .is("transfer_id", null);
  if (error) console.error("[catat-kilat] batalkan gagal", { code: error.code });
  segarkan();
  return { ok: !error && count === 1 };
}
