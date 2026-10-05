import "server-only";

import type { SelectOption } from "@/components/transactions/select-field";
import { categoryOptions } from "@/lib/categories/options";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Pilihan akun & kategori aktif untuk form transaksi.
// `includeIds`: akun/kategori yang sudah diarsipkan tapi dipakai transaksi yang sedang diedit.
export async function loadTransactionFormOptions(supabase: Supabase, includeIds: string[] = []) {
  const [accountsRes, categoriesRes] = await Promise.all([
    supabase.from("accounts").select("id, name, archived_at").order("created_at"),
    supabase.from("categories").select("id, parent_id, name, type, archived_at"),
  ]);
  if (accountsRes.error) console.error("[transactions] muat akun gagal", { code: accountsRes.error.code });
  if (categoriesRes.error) console.error("[transactions] muat kategori gagal", { code: categoriesRes.error.code });

  const dipakai = new Set(includeIds);
  const accounts: SelectOption[] = (accountsRes.data ?? [])
    .filter((a) => !a.archived_at || dipakai.has(a.id))
    .map((a) => ({ value: a.id, label: a.archived_at ? `${a.name} (diarsipkan)` : a.name }));
  const categories = categoryOptions(
    (categoriesRes.data ?? []).filter((c) => !c.archived_at || dipakai.has(c.id)),
  );

  return { accounts, categories, error: accountsRes.error ?? categoriesRes.error };
}
