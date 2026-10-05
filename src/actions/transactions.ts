"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { pesanErrorTransaksi } from "@/lib/transactions/errors";
import { transactionSchema, type TransactionInput } from "@/lib/validators/transaction";

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

async function simpanBaru(input: TransactionInput) {
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

  const { error } = await simpanBaru(parsed.data);
  if (error) {
    console.error("[transactions] tambah gagal", { code: error.code });
    return { error: pesanErrorTransaksi(error), values };
  }

  revalidatePath("/transaksi");
  revalidatePath("/akun");

  // "Simpan & tambah lagi": kembali ke form kosong dengan jenis & akun yang sama.
  if (formData.get("lanjut") === "1") {
    const params = new URLSearchParams({ tipe: parsed.data.type, tersimpan: "1" });
    const akun = parsed.data.type === "transfer" ? parsed.data.fromAccountId : parsed.data.accountId;
    params.set("akun", akun);
    redirect(`/transaksi/baru?${params}`);
  }
  redirect("/transaksi?tersimpan=1");
}
