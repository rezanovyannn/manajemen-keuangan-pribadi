"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { accountSchema } from "@/lib/validators/account";
import { idSchema } from "@/lib/validators/common";

export type AccountFormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: { name?: string; type?: string; openingBalance?: string; investmentKind?: string };
};

const PESAN_GAGAL = "Akun gagal disimpan. Silakan coba lagi.";

function bacaForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  return { name: get("name"), type: get("type"), openingBalance: get("openingBalance"), investmentKind: get("investmentKind") };
}

function pesanDb(error: { code?: string }) {
  // 23505 = unique_violation (nama akun aktif kembar)
  if (error.code === "23505") return "Nama akun sudah dipakai. Gunakan nama lain.";
  // 23503 = akun investasi yang sudah punya riwayat nilai tidak bisa diganti jenisnya
  if (error.code === "23503") return "Jenis akun tidak bisa diubah karena sudah punya riwayat nilai investasi.";
  return PESAN_GAGAL;
}

export async function createAccount(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const values = bacaForm(formData);
  const parsed = accountSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    investment_kind: parsed.data.investmentKind,
    opening_balance: parsed.data.openingBalance,
  });
  if (error) {
    console.error("[accounts] tambah gagal", { code: error.code });
    return { error: pesanDb(error), values };
  }

  revalidatePath("/akun");
  redirect("/akun");
}

export async function updateAccount(
  id: string,
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const values = bacaForm(formData);
  const parsed = accountSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  if (!idSchema.safeParse(id).success) return { error: PESAN_GAGAL, values };

  const { supabase } = await requireUser();
  // RLS memastikan hanya akun milik pengguna ini yang bisa diubah.
  const { error, count } = await supabase
    .from("accounts")
    .update(
      {
        name: parsed.data.name,
        type: parsed.data.type,
        investment_kind: parsed.data.investmentKind,
        opening_balance: parsed.data.openingBalance,
      },
      { count: "exact" },
    )
    .eq("id", id);
  if (error || count === 0) {
    if (error) console.error("[accounts] ubah gagal", { code: error.code });
    return { error: error ? pesanDb(error) : "Akun tidak ditemukan.", values };
  }

  revalidatePath("/akun");
  redirect("/akun");
}

export async function setAccountArchived(id: string, archived: boolean) {
  if (!idSchema.safeParse(id).success) redirect("/akun");

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("accounts")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) {
    console.error("[accounts] arsip gagal", { code: error.code });
    // Memulihkan bisa gagal jika nama sudah dipakai akun aktif lain.
    redirect(`/akun?gagal=${error.code === "23505" ? "nama" : "arsip"}`);
  }

  revalidatePath("/akun");
  redirect("/akun");
}
