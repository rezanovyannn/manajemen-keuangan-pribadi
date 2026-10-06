"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validators/common";
import { goalSchema } from "@/lib/validators/goal";

export type GoalFormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};

const FIELDS = ["name", "accountId", "targetAmount", "deadline"] as const;

function bacaForm(formData: FormData) {
  return Object.fromEntries(
    FIELDS.map((k) => {
      const v = formData.get(k);
      return [k, typeof v === "string" ? v : ""];
    }),
  ) as Record<(typeof FIELDS)[number], string>;
}

function pesanDb(error: { code?: string }) {
  if (error.code === "23505") return "Akun ini sudah dipakai untuk tujuan lain. Pilih akun lain.";
  if (error.code === "23503") return "Akun tidak valid.";
  return "Tujuan gagal disimpan. Silakan coba lagi.";
}

function selesai(status: string): never {
  revalidatePath("/tujuan");
  revalidatePath("/beranda");
  redirect(`/tujuan?status=${status}`);
}

export async function createGoal(_prev: GoalFormState, formData: FormData): Promise<GoalFormState> {
  const values = bacaForm(formData);
  const parsed = goalSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    name: parsed.data.name,
    account_id: parsed.data.accountId,
    target_amount: parsed.data.targetAmount,
    deadline: parsed.data.deadline,
  });
  if (error) {
    console.error("[goals] tambah gagal", { code: error.code });
    return { error: pesanDb(error), values };
  }
  selesai("tersimpan");
}

export async function updateGoal(id: string, _prev: GoalFormState, formData: FormData): Promise<GoalFormState> {
  const values = bacaForm(formData);
  const parsed = goalSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  if (!idSchema.safeParse(id).success) return { error: pesanDb({}), values };

  const { supabase } = await requireUser();
  const { error, count } = await supabase
    .from("goals")
    .update(
      {
        name: parsed.data.name,
        account_id: parsed.data.accountId,
        target_amount: parsed.data.targetAmount,
        deadline: parsed.data.deadline,
      },
      { count: "exact" },
    )
    .eq("id", id);
  if (error || count === 0) {
    if (error) console.error("[goals] ubah gagal", { code: error.code });
    return { error: error ? pesanDb(error) : "Tujuan tidak ditemukan.", values };
  }
  selesai("diubah");
}

export async function deleteGoal(id: string) {
  if (!idSchema.safeParse(id).success) redirect("/tujuan");
  const { supabase } = await requireUser();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) console.error("[goals] hapus gagal", { code: error.code });
  selesai(error ? "gagal" : "dihapus");
}
