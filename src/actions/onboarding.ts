"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { monthToDate } from "@/lib/budgets/query";
import { currentMonthInJakarta, todayInJakarta } from "@/lib/dates";
import { allocateToGoal } from "@/lib/goals/allocate";
import { KATEGORI_BUDGET_CEPAT } from "@/lib/onboarding/presets";
import { hrefLangkah, langkahBerikutnya, type Langkah } from "@/lib/onboarding/steps";
import { accountSchema } from "@/lib/validators/account";
import { goalSchema } from "@/lib/validators/goal";
import { rupiahInput } from "@/lib/validators/money";
import { recurringRuleSchema } from "@/lib/validators/recurring";

export type WizardState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};

const GAGAL = "Gagal disimpan. Silakan coba lagi.";

function baca(formData: FormData, fields: readonly string[]) {
  return Object.fromEntries(
    fields.map((k) => {
      const v = formData.get(k);
      return [k, typeof v === "string" ? v : ""];
    }),
  ) as Record<string, string>;
}

function ke(l: Langkah, status?: string): never {
  revalidatePath("/mulai");
  redirect(`${hrefLangkah(l)}${status ? `&status=${status}` : ""}`);
}

// --- Nama -----------------------------------------------------------------------------

const nameSchema = z.object({
  displayName: z.string().trim().min(1, "Nama wajib diisi.").max(50, "Nama maksimal 50 karakter."),
});

export async function saveName(_prev: WizardState, formData: FormData): Promise<WizardState> {
  const values = baca(formData, ["displayName"]);
  const parsed = nameSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ display_name: parsed.data.displayName }).eq("id", user.id);
  if (error) {
    console.error("[onboarding] nama gagal", { code: error.code });
    return { error: GAGAL, values };
  }
  ke(langkahBerikutnya("nama"));
}

// --- Akun -----------------------------------------------------------------------------

export async function addAccount(_prev: WizardState, formData: FormData): Promise<WizardState> {
  const values = baca(formData, ["name", "type", "openingBalance"]);
  const parsed = accountSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    opening_balance: parsed.data.openingBalance,
  });
  if (error) {
    console.error("[onboarding] akun gagal", { code: error.code });
    return { error: error.code === "23505" ? "Nama akun sudah dipakai. Gunakan nama lain." : GAGAL, values };
  }
  revalidatePath("/akun");
  ke("akun", "akun-ditambah");
}

// Lanjut dari langkah akun: minimal satu akun aktif.
export async function continueFromAccounts() {
  const { supabase } = await requireUser();
  const { count, error } = await supabase.from("accounts").select("id", { count: "exact", head: true }).is("archived_at", null);
  if (error || !count) ke("akun", error ? "gagal" : "perlu-akun");
  ke(langkahBerikutnya("akun"));
}

// --- Budget cepat ---------------------------------------------------------------------

// Isian kosong dilewati; yang terisi disimpan untuk bulan ini (menimpa budget yang ada).
export async function saveQuickBudgets(_prev: WizardState, formData: FormData): Promise<WizardState> {
  const { supabase, user } = await requireUser();
  const { data: kategori, error: katError } = await supabase
    .from("categories")
    .select("id, name")
    .eq("type", "expense")
    .is("parent_id", null)
    .is("archived_at", null)
    .in("name", [...KATEGORI_BUDGET_CEPAT]);
  if (katError) return { error: GAGAL };

  const values: Record<string, string> = {};
  const fieldErrors: Record<string, string[]> = {};
  const baris: { user_id: string; category_id: string; month: string; amount: number }[] = [];
  const month = monthToDate(currentMonthInJakarta());
  for (const k of kategori ?? []) {
    const raw = formData.get(`budget-${k.id}`);
    const v = typeof raw === "string" ? raw.trim() : "";
    values[`budget-${k.id}`] = v;
    if (v === "") continue;
    const parsed = rupiahInput({ min: 1, label: "Batas budget" }).safeParse(v);
    if (!parsed.success) fieldErrors[`budget-${k.id}`] = [parsed.error.issues[0]?.message ?? "Nominal tidak valid."];
    else baris.push({ user_id: user.id, category_id: k.id, month, amount: parsed.data });
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  if (baris.length > 0) {
    const { error } = await supabase.from("budgets").upsert(baris, { onConflict: "user_id,category_id,month" });
    if (error) {
      console.error("[onboarding] budget gagal", { code: error.code });
      return { error: GAGAL, values };
    }
    revalidatePath("/budget");
  }
  ke(langkahBerikutnya("budget"));
}

// --- Tagihan rutin --------------------------------------------------------------------

export async function addQuickRule(_prev: WizardState, formData: FormData): Promise<WizardState> {
  const values = baca(formData, ["name", "type", "accountId", "categoryId", "amount", "frequency", "startDate"]);
  const parsed = recurringRuleSchema.safeParse({ ...values, endDate: "", note: "" });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const d = parsed.data;
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("recurring_rules").insert({
    user_id: user.id,
    name: d.name,
    type: d.type,
    account_id: d.accountId,
    category_id: d.categoryId,
    amount: d.amount,
    frequency: d.frequency,
    start_date: d.startDate,
    end_date: null,
    next_due_date: d.startDate,
    note: null,
  });
  if (error) {
    console.error("[onboarding] jadwal gagal", { code: error.code });
    return { error: error.code === "23503" ? "Akun atau kategori tidak valid." : GAGAL, values };
  }
  revalidatePath("/berulang");
  ke("tagihan", "tagihan-ditambah");
}

// --- Tujuan tabungan ------------------------------------------------------------------

const tabunganAwalSchema = z.object({
  initialAccountId: z.string().trim(),
  initialAmount: z.string().trim(),
});

export async function saveQuickGoal(_prev: WizardState, formData: FormData): Promise<WizardState> {
  const values = baca(formData, ["name", "targetAmount", "deadline", "initialAccountId", "initialAmount"]);
  const parsed = goalSchema.safeParse(values);
  const awal = tabunganAwalSchema.parse(values);
  const fieldErrors: Record<string, string[] | undefined> = parsed.success ? {} : z.flattenError(parsed.error).fieldErrors;

  // Tabungan awal opsional: jika nominal diisi, akun wajib dipilih.
  let nominalAwal: number | null = null;
  if (awal.initialAmount !== "") {
    const n = rupiahInput({ min: 1, label: "Tabungan awal" }).safeParse(awal.initialAmount);
    if (!n.success) fieldErrors.initialAmount = [n.error.issues[0]?.message ?? "Nominal tidak valid."];
    else nominalAwal = n.data;
    if (!z.uuid().safeParse(awal.initialAccountId).success) fieldErrors.initialAccountId = ["Pilih akun asal tabungan."];
  }
  if (!parsed.success || Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  const { supabase, user } = await requireUser();
  const { data: goal, error } = await supabase
    .from("goals")
    .insert({ user_id: user.id, name: parsed.data.name, target_amount: parsed.data.targetAmount, deadline: parsed.data.deadline })
    .select("id")
    .single();
  if (error || !goal) {
    if (error) console.error("[onboarding] tujuan gagal", { code: error.code });
    return { error: GAGAL, values };
  }

  if (nominalAwal !== null) {
    const gagal = await allocateToGoal(supabase, {
      goalId: goal.id,
      kind: "sisihkan",
      accountId: awal.initialAccountId,
      amount: nominalAwal,
      occurredOn: todayInJakarta(),
      note: null,
    });
    if (gagal) {
      // Batalkan tujuan agar pengiriman ulang tidak membuat tujuan ganda.
      await supabase.from("goals").delete().eq("id", goal.id);
      const field = gagal.field === "amount" ? "initialAmount" : gagal.field === "accountId" ? "initialAccountId" : null;
      return field ? { fieldErrors: { [field]: [gagal.message] }, values } : { error: gagal.message, values };
    }
  }
  revalidatePath("/tujuan");
  ke(langkahBerikutnya("tujuan"));
}

// --- Selesai / lewati / checklist -----------------------------------------------------

async function tandaiSelesai() {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", user.id);
  if (error) console.error("[onboarding] selesai gagal", { code: error.code });
  revalidatePath("/beranda");
}

export async function finishOnboarding() {
  await tandaiSelesai();
  redirect("/beranda?status=siap");
}

// "Nanti saja": tidak diarahkan ke wizard lagi; bisa dibuka dari Profil atau checklist.
export async function skipOnboarding() {
  await tandaiSelesai();
  redirect("/beranda");
}

export async function dismissChecklist() {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ checklist_dismissed_at: new Date().toISOString() }).eq("id", user.id);
  if (error) console.error("[onboarding] tutup checklist gagal", { code: error.code });
  revalidatePath("/beranda");
  redirect("/beranda");
}
