"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { pesanErrorAuth } from "@/lib/auth/errors";
import { HALAMAN_MASUK, HALAMAN_SETELAH_MASUK, safeNextPath } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";
import { daftarSchema, masukSchema } from "@/lib/validators/auth";

export type AuthFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  // Nilai yang diketik pengguna, dikembalikan agar form tidak kosong saat gagal.
  // Password sengaja tidak ikut dikembalikan.
  values?: { email?: string; displayName?: string };
};

function teks(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export async function masuk(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { email: teks(formData, "email") };
  const parsed = masukSchema.safeParse({ email: values.email, password: teks(formData, "password") });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    console.error("[auth] masuk gagal", { code: error.code, status: error.status });
    return { error: pesanErrorAuth(error.code), values };
  }

  redirect(safeNextPath(teks(formData, "next")));
}

export async function daftar(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { email: teks(formData, "email"), displayName: teks(formData, "displayName") };
  const parsed = daftarSchema.safeParse({ ...values, password: teks(formData, "password") });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const { email, password, displayName } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${await getOrigin()}/auth/konfirmasi`,
    },
  });
  if (error) {
    console.error("[auth] daftar gagal", { code: error.code, status: error.status });
    return { error: pesanErrorAuth(error.code), values };
  }

  // Sesi langsung ada jika konfirmasi email dimatikan di Supabase.
  if (data.session) redirect(HALAMAN_SETELAH_MASUK);

  return {
    success: "Pendaftaran berhasil. Cek email Anda dan klik link konfirmasi untuk masuk.",
    values,
  };
}

export async function keluar() {
  const supabase = await createClient();
  // scope "local": hanya keluar di perangkat ini, sesi di HP/laptop lain tetap aktif.
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) console.error("[auth] keluar gagal", { code: error.code, status: error.status });
  redirect(HALAMAN_MASUK);
}

async function getOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}
