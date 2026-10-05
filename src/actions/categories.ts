"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { categoryTypeParam } from "@/lib/categories/params";
import type { CategoryType } from "@/lib/supabase/database.types";
import { categoryNameSchema, categorySchema } from "@/lib/validators/category";
import { idSchema } from "@/lib/validators/common";

export type CategoryFormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: { name?: string; parentId?: string };
};

const PESAN_GAGAL = "Kategori gagal disimpan. Silakan coba lagi.";

function teks(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function pesanDb(error: { code?: string }) {
  switch (error.code) {
    case "23505": // unique_violation
      return "Nama kategori sudah dipakai di tempat yang sama. Gunakan nama lain.";
    case "23503": // foreign_key_violation (induk beda pengguna/tipe atau tidak ada)
    case "P0001": // dari trigger check_category_depth
      return "Induk kategori tidak valid.";
    default:
      return PESAN_GAGAL;
  }
}

function halamanDaftar(type: CategoryType) {
  return `/kategori?tipe=${categoryTypeParam(type)}`;
}

export async function createCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const values = { name: teks(formData, "name"), parentId: teks(formData, "parentId") };
  const parsed = categorySchema.safeParse({ ...values, type: teks(formData, "type") });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    parent_id: parsed.data.parentId,
  });
  if (error) {
    console.error("[categories] tambah gagal", { code: error.code });
    return { error: pesanDb(error), values };
  }

  revalidatePath("/kategori");
  redirect(halamanDaftar(parsed.data.type));
}

export async function renameCategory(
  id: string,
  type: CategoryType,
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const values = { name: teks(formData, "name") };
  const parsed = categoryNameSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  if (!idSchema.safeParse(id).success) return { error: PESAN_GAGAL, values };

  const { supabase } = await requireUser();
  const { error, count } = await supabase
    .from("categories")
    .update({ name: parsed.data.name }, { count: "exact" })
    .eq("id", id);
  if (error || count === 0) {
    if (error) console.error("[categories] ubah gagal", { code: error.code });
    return { error: error ? pesanDb(error) : "Kategori tidak ditemukan.", values };
  }

  revalidatePath("/kategori");
  redirect(halamanDaftar(type));
}

// Mengarsipkan/memulihkan kategori sekaligus sub-kategorinya.
export async function setCategoryArchived(id: string, type: CategoryType, archived: boolean) {
  const kembali = halamanDaftar(type);
  if (!idSchema.safeParse(id).success) redirect(kembali);

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("categories")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .or(`id.eq.${id},parent_id.eq.${id}`);
  if (error) {
    console.error("[categories] arsip gagal", { code: error.code });
    redirect(`${kembali}&gagal=${error.code === "23505" ? "nama" : "arsip"}`);
  }

  revalidatePath("/kategori");
  redirect(kembali);
}
