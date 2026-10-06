"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { TransactionFormState } from "@/actions/transactions";
import { requireUser } from "@/lib/auth/session";
import { PESAN_GAGAL_TRANSAKSI, pesanErrorTransaksi } from "@/lib/transactions/errors";
import { idSchema } from "@/lib/validators/common";
import { transactionSchema } from "@/lib/validators/transaction";

const FIELDS = ["type", "amount", "accountId", "categoryId", "fromAccountId", "toAccountId", "occurredOn", "note"] as const;

function bacaForm(formData: FormData) {
  return Object.fromEntries(
    FIELDS.map((k) => {
      const v = formData.get(k);
      return [k, typeof v === "string" ? v : ""];
    }),
  ) as Record<(typeof FIELDS)[number], string>;
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
