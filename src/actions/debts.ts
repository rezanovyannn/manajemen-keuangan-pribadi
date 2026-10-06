"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validators/common";
import { debtSchema } from "@/lib/validators/debt";

export type DebtFormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};

const FIELDS = ["kind", "name", "counterparty", "principal", "installmentAmount", "startDate", "dueDate", "note"] as const;
const PESAN_GAGAL = "Data gagal disimpan. Silakan coba lagi.";

function bacaForm(formData: FormData) {
  return Object.fromEntries(
    FIELDS.map((k) => {
      const v = formData.get(k);
      return [k, typeof v === "string" ? v : ""];
    }),
  ) as Record<(typeof FIELDS)[number], string>;
}

function ke(path: string): never {
  revalidatePath("/utang");
  revalidatePath("/net-worth");
  revalidatePath("/beranda");
  redirect(path);
}

export async function createDebt(_prev: DebtFormState, formData: FormData): Promise<DebtFormState> {
  const values = bacaForm(formData);
  const parsed = debtSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const d = parsed.data;

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("debts").insert({
    user_id: user.id,
    kind: d.kind,
    name: d.name,
    counterparty: d.counterparty,
    principal: d.principal,
    installment_amount: d.installmentAmount,
    start_date: d.startDate,
    due_date: d.dueDate,
    note: d.note,
  });
  if (error) {
    console.error("[debts] tambah gagal", { code: error.code });
    return { error: PESAN_GAGAL, values };
  }
  ke(`/utang?jenis=${d.kind}&status=tersimpan`);
}

export async function updateDebt(id: string, _prev: DebtFormState, formData: FormData): Promise<DebtFormState> {
  const values = bacaForm(formData);
  const parsed = debtSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  if (!idSchema.safeParse(id).success) return { error: PESAN_GAGAL, values };
  const d = parsed.data;

  const { supabase } = await requireUser();
  const { error, count } = await supabase
    .from("debts")
    .update(
      {
        name: d.name,
        counterparty: d.counterparty,
        principal: d.principal,
        installment_amount: d.installmentAmount,
        start_date: d.startDate,
        due_date: d.dueDate,
        note: d.note,
      },
      { count: "exact" },
    )
    .eq("id", id);
  if (error || count === 0) {
    if (error) console.error("[debts] ubah gagal", { code: error.code });
    return { error: error ? PESAN_GAGAL : "Data tidak ditemukan.", values };
  }
  ke(`/utang/${id}?status=diubah`);
}

export async function setDebtArchived(id: string, archived: boolean) {
  if (!idSchema.safeParse(id).success) redirect("/utang");
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("debts")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) console.error("[debts] arsip gagal", { code: error.code });
  ke(`/utang/${id}?status=${error ? "gagal" : archived ? "diarsipkan" : "dipulihkan"}`);
}

export async function deleteDebt(id: string) {
  if (!idSchema.safeParse(id).success) redirect("/utang");
  const { supabase } = await requireUser();
  const { error } = await supabase.from("debts").delete().eq("id", id);
  if (error) {
    console.error("[debts] hapus gagal", { code: error.code });
    // 23503: sudah ada pembayaran yang ditandai -> arsipkan saja.
    ke(`/utang/${id}?status=${error.code === "23503" ? "ada-pembayaran" : "gagal"}`);
  }
  ke("/utang?status=dihapus");
}
