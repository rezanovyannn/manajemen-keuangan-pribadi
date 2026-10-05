"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { isValidDateString, todayInJakarta } from "@/lib/dates";
import { advanceRule } from "@/lib/recurring/advance";
import { firstOccurrenceOnOrAfter } from "@/lib/recurring/schedule";
import { idSchema } from "@/lib/validators/common";
import { recurringRuleSchema } from "@/lib/validators/recurring";

export type RecurringFormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};

const FIELDS = ["name", "type", "accountId", "categoryId", "amount", "frequency", "startDate", "endDate", "note"] as const;
const PESAN_GAGAL = "Jadwal gagal disimpan. Silakan coba lagi.";

function bacaForm(formData: FormData) {
  return Object.fromEntries(
    FIELDS.map((k) => {
      const v = formData.get(k);
      return [k, typeof v === "string" ? v : ""];
    }),
  ) as Record<(typeof FIELDS)[number], string>;
}

function pesanDb(error: { code?: string }) {
  if (error.code === "23503") return "Akun atau kategori tidak valid untuk jadwal ini.";
  return PESAN_GAGAL;
}

function selesai(status: string): never {
  revalidatePath("/berulang");
  revalidatePath("/beranda");
  redirect(`/berulang?status=${status}`);
}

export async function createRule(_prev: RecurringFormState, formData: FormData): Promise<RecurringFormState> {
  const values = bacaForm(formData);
  const parsed = recurringRuleSchema.safeParse(values);
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
    end_date: d.endDate,
    next_due_date: d.startDate,
    note: d.note,
  });
  if (error) {
    console.error("[recurring] tambah gagal", { code: error.code });
    return { error: pesanDb(error), values };
  }
  selesai("tersimpan");
}

export async function updateRule(id: string, _prev: RecurringFormState, formData: FormData): Promise<RecurringFormState> {
  const values = bacaForm(formData);
  const parsed = recurringRuleSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  if (!idSchema.safeParse(id).success) return { error: PESAN_GAGAL, values };
  const d = parsed.data;

  const { supabase } = await requireUser();
  const { data: lama } = await supabase
    .from("recurring_rules")
    .select("start_date, frequency, next_due_date")
    .eq("id", id)
    .maybeSingle();
  if (!lama) return { error: "Jadwal tidak ditemukan.", values };

  // Jadwal berubah: mulai lagi dari jadwal pertama pada/sesudah hari ini.
  const jadwalBerubah = lama.start_date !== d.startDate || lama.frequency !== d.frequency;
  const nextDue = jadwalBerubah ? firstOccurrenceOnOrAfter(d.startDate, d.frequency, todayInJakarta()) : lama.next_due_date;

  const { error } = await supabase
    .from("recurring_rules")
    .update({
      name: d.name,
      type: d.type,
      account_id: d.accountId,
      category_id: d.categoryId,
      amount: d.amount,
      frequency: d.frequency,
      start_date: d.startDate,
      end_date: d.endDate,
      next_due_date: nextDue,
      note: d.note,
    })
    .eq("id", id);
  if (error) {
    console.error("[recurring] ubah gagal", { code: error.code });
    return { error: pesanDb(error), values };
  }
  selesai("diubah");
}

export async function setRulePaused(id: string, paused: boolean) {
  if (!idSchema.safeParse(id).success) redirect("/berulang");
  const { supabase } = await requireUser();
  const { error } = await supabase.from("recurring_rules").update({ paused }).eq("id", id);
  if (error) console.error("[recurring] jeda gagal", { code: error.code });
  selesai(error ? "gagal" : paused ? "dijeda" : "dilanjutkan");
}

export async function deleteRule(id: string) {
  if (!idSchema.safeParse(id).success) redirect("/berulang");
  const { supabase } = await requireUser();
  const { error } = await supabase.from("recurring_rules").delete().eq("id", id);
  if (error) console.error("[recurring] hapus gagal", { code: error.code });
  selesai(error ? "gagal" : "dihapus");
}

// "Lewati": jadwal tanggal ini tidak dicatat, maju ke jadwal berikutnya.
export async function skipOccurrence(id: string, date: string) {
  if (!idSchema.safeParse(id).success || !isValidDateString(date)) redirect("/beranda");
  const { supabase } = await requireUser();
  const { error } = await advanceRule(supabase, id, date);
  if (error) console.error("[recurring] lewati gagal", { code: error.code });
  revalidatePath("/beranda");
  revalidatePath("/berulang");
  redirect(`/beranda?status=${error ? "gagal" : "dilewati"}`);
}
