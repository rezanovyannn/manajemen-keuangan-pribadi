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
  fee?: string;
};

export type TransactionFormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: TransactionFormValues;
};

const FIELDS = ["type", "amount", "accountId", "categoryId", "fromAccountId", "toAccountId", "occurredOn", "note", "fee"] as const;

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

// Penanda utang/piutang (dikirim saat menekan "Bayar"/"Terima" dari halaman utang).
function bacaUtang(formData: FormData): string | null | "invalid" {
  const debtId = formData.get("debtId");
  if (!debtId) return null;
  return idSchema.safeParse(debtId).success ? String(debtId) : "invalid";
}

async function simpanBaru(input: TransactionInput, mark: RecurringMark | null, debtId: string | null) {
  const { supabase, user } = await requireUser();
  if (input.type === "transfer") {
    const args = {
      p_from_account_id: input.fromAccountId,
      p_to_account_id: input.toAccountId,
      p_amount: input.amount,
      p_occurred_on: input.occurredOn,
      p_note: input.note,
    };
    // Biaya admin transfer dipotong dari akun asal, dalam satu fungsi database (atomik).
    return input.fee ? supabase.rpc("create_transfer_with_fee", { ...args, p_fee: input.fee }) : supabase.rpc("create_transfer", args);
  }

  const induk = {
    user_id: user.id,
    type: input.type,
    account_id: input.accountId,
    category_id: input.categoryId,
    amount: input.amount,
    occurred_on: input.occurredOn,
    note: input.note,
    // Kolom penanda hanya dikirim jika memang dipakai.
    ...(mark ? { recurring_rule_id: mark.ruleId, recurring_date: mark.date } : {}),
    ...(debtId ? { debt_id: debtId } : {}),
  };
  if (!input.fee) return supabase.from("transactions").insert(induk);

  // Dengan biaya admin: induk + biaya disimpan dalam SATU perintah insert (atomik).
  const kategori = await supabase.rpc("ensure_fee_category");
  if (kategori.error) return kategori;
  const id = crypto.randomUUID();
  return supabase.from("transactions").insert([
    { ...induk, id },
    {
      user_id: user.id,
      type: "expense" as const,
      account_id: input.accountId,
      category_id: kategori.data,
      amount: input.fee,
      occurred_on: input.occurredOn,
      note: "Biaya admin",
      fee_for_id: id,
    },
  ]);
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
  const debtId = bacaUtang(formData);
  if (mark === "invalid" || debtId === "invalid" || ((mark || debtId) && parsed.data.type === "transfer")) {
    return { error: PESAN_GAGAL_TRANSAKSI, values };
  }

  const { error } = await simpanBaru(parsed.data, mark, debtId);
  // Jadwal ini sudah pernah dicatat (misal tombol ditekan dua kali): jangan buat duplikat.
  const sudahDicatat = mark && error?.code === "23505" && error.message.includes("transactions_recurring_unique");
  if (error && !sudahDicatat) {
    console.error("[transactions] tambah gagal", { code: error.code });
    // Bayar utang harus pengeluaran, terima piutang harus pemasukan (dijaga FK).
    if (debtId && error.message.includes("transactions_debt_fkey")) {
      return { error: "Bayar utang dicatat sebagai pengeluaran, terima piutang sebagai pemasukan.", values };
    }
    return { error: pesanErrorTransaksi(error), values };
  }

  revalidatePath("/transaksi");
  revalidatePath("/akun");

  if (debtId) {
    revalidatePath("/utang");
    revalidatePath("/net-worth");
    redirect(`/utang/${debtId}?status=dibayar`);
  }

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
