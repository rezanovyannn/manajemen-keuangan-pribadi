"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { advanceRule } from "@/lib/recurring/advance";
import { PESAN_GAGAL_TRANSAKSI, pesanErrorTransaksi } from "@/lib/transactions/errors";
import { idSchema } from "@/lib/validators/common";
import { recurringMarkSchema } from "@/lib/validators/recurring";
import { transactionSchema, type TransactionInput } from "@/lib/validators/transaction";

type RecurringMark = { ruleId: string; date: string };

export type TransactionFormValues = {
  type?: string;
  amount?: string;
  accountId?: string;
  categoryId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  occurredOn?: string;
  note?: string;
};

export type TransactionFormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: TransactionFormValues;
};

const FIELDS = ["type", "amount", "accountId", "categoryId", "fromAccountId", "toAccountId", "occurredOn", "note"] as const;

function bacaForm(formData: FormData): Required<TransactionFormValues> {
  const out = {} as Required<TransactionFormValues>;
  for (const k of FIELDS) {
    const v = formData.get(k);
    out[k] = typeof v === "string" ? v : "";
  }
  return out;
}

// Penanda jadwal berulang (dikirim saat menekan "Catat" dari saran di Beranda).
function bacaPenanda(formData: FormData): RecurringMark | null | "invalid" {
  const ruleId = formData.get("recurringRuleId");
  const date = formData.get("recurringDate");
  if (!ruleId && !date) return null;
  const parsed = recurringMarkSchema.safeParse({ ruleId, date });
  return parsed.success ? parsed.data : "invalid";
}

async function simpanBaru(input: TransactionInput, mark: RecurringMark | null) {
  const { supabase, user } = await requireUser();
  if (input.type === "transfer") {
    return supabase.rpc("create_transfer", {
      p_from_account_id: input.fromAccountId,
      p_to_account_id: input.toAccountId,
      p_amount: input.amount,
      p_occurred_on: input.occurredOn,
      p_note: input.note,
    });
  }
  return supabase.from("transactions").insert({
    user_id: user.id,
    type: input.type,
    account_id: input.accountId,
    category_id: input.categoryId,
    amount: input.amount,
    occurred_on: input.occurredOn,
    note: input.note,
    // Kolom jadwal hanya dikirim jika transaksi berasal dari jadwal berulang.
    ...(mark ? { recurring_rule_id: mark.ruleId, recurring_date: mark.date } : {}),
  });
}

export async function createTransaction(
  _prev: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const values = bacaForm(formData);
  const parsed = transactionSchema.safeParse(values);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    return { fieldErrors: flat.fieldErrors, error: flat.formErrors[0], values };
  }

  const mark = bacaPenanda(formData);
  if (mark === "invalid" || (mark && parsed.data.type === "transfer")) {
    return { error: PESAN_GAGAL_TRANSAKSI, values };
  }

  const { error } = await simpanBaru(parsed.data, mark);
  // Jadwal ini sudah pernah dicatat (misal tombol ditekan dua kali): jangan buat duplikat.
  const sudahDicatat = mark && error?.code === "23505" && error.message.includes("transactions_recurring_unique");
  if (error && !sudahDicatat) {
    console.error("[transactions] tambah gagal", { code: error.code });
    return { error: pesanErrorTransaksi(error), values };
  }

  revalidatePath("/transaksi");
  revalidatePath("/akun");

  if (mark) {
    const adv = await advanceRule((await requireUser()).supabase, mark.ruleId, mark.date);
    if (adv.error) console.error("[transactions] majukan jadwal gagal", { code: adv.error.code });
    revalidatePath("/beranda");
    revalidatePath("/berulang");
    redirect(`/beranda?status=${sudahDicatat ? "sudah-dicatat" : "dicatat"}`);
  }

  // "Simpan & tambah lagi": kembali ke form kosong dengan jenis & akun yang sama.
  if (formData.get("lanjut") === "1") {
    const params = new URLSearchParams({ tipe: parsed.data.type, tersimpan: "1" });
    const akun = parsed.data.type === "transfer" ? parsed.data.fromAccountId : parsed.data.accountId;
    params.set("akun", akun);
    redirect(`/transaksi/baru?${params}`);
  }
  redirect("/transaksi?tersimpan=1");
}

// Transaksi yang sedang diedit. transferId terisi jika transaksi berupa transfer.
export type EditTarget = { id: string; transferId: string | null };

function targetValid(target: EditTarget) {
  return idSchema.safeParse(target.id).success && (target.transferId === null || idSchema.safeParse(target.transferId).success);
}

export async function updateTransaction(
  target: EditTarget,
  _prev: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const values = bacaForm(formData);
  const parsed = transactionSchema.safeParse(values);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    return { fieldErrors: flat.fieldErrors, error: flat.formErrors[0], values };
  }
  const input = parsed.data;
  // Transfer tidak bisa diubah menjadi pemasukan/pengeluaran atau sebaliknya.
  if (!targetValid(target) || (target.transferId !== null) !== (input.type === "transfer")) {
    return { error: PESAN_GAGAL_TRANSAKSI, values };
  }

  const { supabase } = await requireUser();
  const { error, count } =
    input.type === "transfer"
      ? await supabase
          .rpc("update_transfer", {
            p_transfer_id: target.transferId!,
            p_from_account_id: input.fromAccountId,
            p_to_account_id: input.toAccountId,
            p_amount: input.amount,
            p_occurred_on: input.occurredOn,
            p_note: input.note,
          })
          .then((r) => ({ error: r.error, count: 1 }))
      : await supabase
          .from("transactions")
          .update(
            {
              type: input.type,
              account_id: input.accountId,
              category_id: input.categoryId,
              amount: input.amount,
              occurred_on: input.occurredOn,
              note: input.note,
            },
            { count: "exact" },
          )
          .eq("id", target.id);

  if (error || count === 0) {
    if (error) console.error("[transactions] ubah gagal", { code: error.code });
    return { error: error ? pesanErrorTransaksi(error) : "Transaksi tidak ditemukan.", values };
  }

  revalidatePath("/transaksi");
  revalidatePath("/akun");
  redirect(`/transaksi?bulan=${input.occurredOn.slice(0, 7)}&status=diubah`);
}

export async function deleteTransaction(target: EditTarget) {
  if (!targetValid(target)) redirect("/transaksi");

  const { supabase } = await requireUser();
  const { error } = target.transferId
    ? await supabase.rpc("delete_transfer", { p_transfer_id: target.transferId })
    : await supabase.from("transactions").delete().eq("id", target.id);
  if (error) {
    console.error("[transactions] hapus gagal", { code: error.code });
    redirect(`/transaksi/${target.id}?gagal=hapus`);
  }

  revalidatePath("/transaksi");
  revalidatePath("/akun");
  redirect("/transaksi?status=dihapus");
}
