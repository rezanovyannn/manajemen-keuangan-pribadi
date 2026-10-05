"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { monthToDate } from "@/lib/budgets/query";
import { shiftMonth } from "@/lib/dates";
import { budgetAmountSchema, budgetSchema, monthSchema } from "@/lib/validators/budget";
import { idSchema } from "@/lib/validators/common";

export type BudgetFormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: { categoryId?: string; amount?: string };
};

const PESAN_GAGAL = "Budget gagal disimpan. Silakan coba lagi.";

function teks(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function pesanDb(error: { code?: string; message?: string }) {
  if (error.code === "23505") return "Kategori ini sudah punya budget di bulan tersebut.";
  if (error.message === "Kategori sudah diarsipkan") return "Kategori sudah diarsipkan. Pilih kategori lain.";
  if (error.code === "23503") return "Kategori tidak valid untuk budget.";
  return PESAN_GAGAL;
}

function halaman(month: string, status?: string) {
  return `/budget?bulan=${month}${status ? `&status=${status}` : ""}`;
}

export async function createBudget(_prev: BudgetFormState, formData: FormData): Promise<BudgetFormState> {
  const values = { categoryId: teks(formData, "categoryId"), amount: teks(formData, "amount") };
  const parsed = budgetSchema.safeParse({ ...values, month: teks(formData, "month") });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("budgets").insert({
    user_id: user.id,
    category_id: parsed.data.categoryId,
    month: monthToDate(parsed.data.month),
    amount: parsed.data.amount,
  });
  if (error) {
    console.error("[budgets] tambah gagal", { code: error.code });
    return { error: pesanDb(error), values };
  }

  revalidatePath("/budget");
  redirect(halaman(parsed.data.month, "tersimpan"));
}

export async function updateBudget(
  id: string,
  month: string,
  _prev: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  const values = { amount: teks(formData, "amount") };
  const parsed = budgetAmountSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  if (!idSchema.safeParse(id).success || !monthSchema.safeParse(month).success) return { error: PESAN_GAGAL, values };

  const { supabase } = await requireUser();
  const { error, count } = await supabase
    .from("budgets")
    .update({ amount: parsed.data.amount }, { count: "exact" })
    .eq("id", id);
  if (error || count === 0) {
    if (error) console.error("[budgets] ubah gagal", { code: error.code });
    return { error: error ? pesanDb(error) : "Budget tidak ditemukan.", values };
  }

  revalidatePath("/budget");
  redirect(halaman(month, "diubah"));
}

export async function deleteBudget(id: string, month: string) {
  const bulan = monthSchema.safeParse(month).success ? month : "";
  if (!idSchema.safeParse(id).success) redirect("/budget");

  const { supabase } = await requireUser();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) {
    console.error("[budgets] hapus gagal", { code: error.code });
    redirect(halaman(bulan, "gagal"));
  }

  revalidatePath("/budget");
  redirect(halaman(bulan, "dihapus"));
}

// Salin budget bulan lalu ke bulan ini. Kategori yang sudah punya budget atau
// sudah diarsipkan dilewati, sehingga aman ditekan lebih dari sekali.
export async function copyBudgetsFromPreviousMonth(month: string) {
  if (!monthSchema.safeParse(month).success) redirect("/budget");

  const { supabase, user } = await requireUser();
  const [prevRes, currentRes, activeRes] = await Promise.all([
    supabase.from("budgets").select("category_id, amount").eq("month", monthToDate(shiftMonth(month, -1))),
    supabase.from("budgets").select("category_id").eq("month", monthToDate(month)),
    supabase.from("categories").select("id").is("archived_at", null),
  ]);
  const loadError = prevRes.error ?? currentRes.error ?? activeRes.error;
  if (loadError) {
    console.error("[budgets] salin gagal", { code: loadError.code });
    redirect(halaman(month, "gagal"));
  }

  const sudahAda = new Set((currentRes.data ?? []).map((b) => b.category_id));
  const aktif = new Set((activeRes.data ?? []).map((c) => c.id));
  const baru = (prevRes.data ?? [])
    .filter((b) => !sudahAda.has(b.category_id) && aktif.has(b.category_id))
    .map((b) => ({ user_id: user.id, category_id: b.category_id, month: monthToDate(month), amount: b.amount }));

  if (baru.length > 0) {
    const { error } = await supabase
      .from("budgets")
      .upsert(baru, { onConflict: "user_id,category_id,month", ignoreDuplicates: true });
    if (error) {
      console.error("[budgets] salin gagal", { code: error.code });
      redirect(halaman(month, "gagal"));
    }
  }

  revalidatePath("/budget");
  redirect(halaman(month, "disalin"));
}
