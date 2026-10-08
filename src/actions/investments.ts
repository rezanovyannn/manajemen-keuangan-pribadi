"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validators/common";
import { valuationSchema } from "@/lib/validators/investment";

export type ValuationFormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};

const FIELDS = ["marketValue", "valuedOn", "units", "note"] as const;

function selesai(accountId: string, status: string): never {
  for (const p of ["/akun", `/akun/${accountId}`, "/net-worth", "/beranda"]) revalidatePath(p);
  redirect(`/akun/${accountId}?status=${status}`);
}

// Perbarui nilai pasar akun investasi (manual). FK di database memastikan akun milik
// pengguna dan berjenis investasi.
export async function addValuation(accountId: string, _prev: ValuationFormState, formData: FormData): Promise<ValuationFormState> {
  const values = Object.fromEntries(FIELDS.map((k) => [k, String(formData.get(k) ?? "")])) as Record<(typeof FIELDS)[number], string>;
  const parsed = valuationSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  if (!idSchema.safeParse(accountId).success) return { error: "Akun tidak valid.", values };

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("investment_valuations").insert({
    user_id: user.id,
    account_id: accountId,
    market_value: parsed.data.marketValue,
    valued_on: parsed.data.valuedOn,
    units: parsed.data.units,
    note: parsed.data.note,
  });
  if (error) {
    console.error("[investasi] simpan nilai gagal", { code: error.code });
    return { error: error.code === "23503" ? "Nilai hanya bisa dicatat untuk akun investasi." : "Nilai gagal disimpan. Silakan coba lagi.", values };
  }
  selesai(accountId, "nilai-disimpan");
}

export async function deleteValuation(accountId: string, valuationId: string) {
  if (!idSchema.safeParse(accountId).success || !idSchema.safeParse(valuationId).success) redirect("/akun");
  const { supabase } = await requireUser();
  const { error } = await supabase.from("investment_valuations").delete().eq("id", valuationId).eq("account_id", accountId);
  if (error) console.error("[investasi] hapus nilai gagal", { code: error.code });
  selesai(accountId, error ? "gagal" : "nilai-dihapus");
}
