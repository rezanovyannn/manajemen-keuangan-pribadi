import "server-only";

import { categoryOptions } from "@/lib/categories/options";
import { monthRange } from "@/lib/dates";
import type { createClient } from "@/lib/supabase/server";

import { escapeLike, filterByAccount, toListItems, type TransactionRowLite } from "./list";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type TransactionFilters = {
  month: string; // YYYY-MM
  accountId?: string;
  categoryId?: string;
  search?: string;
};

const KOLOM = "id, account_id, category_id, type, amount, occurred_on, note, transfer_id, created_at, fee_for_id";

// Muat transaksi satu bulan beserta nama akun & label kategori, sudah difilter.
export async function loadMonthTransactions(supabase: Supabase, filters: TransactionFilters) {
  const { start, end } = monthRange(filters.month);

  const [accountsRes, categoriesRes] = await Promise.all([
    supabase.from("accounts").select("id, name, archived_at").order("created_at"),
    supabase.from("categories").select("id, parent_id, name, type, archived_at"),
  ]);
  const accounts = accountsRes.data ?? [];
  const categories = categoriesRes.data ?? [];

  let query = supabase
    .from("transactions")
    .select(KOLOM)
    .gte("occurred_on", start)
    .lt("occurred_on", end);

  if (filters.categoryId) {
    // Kategori utama ikut menyertakan sub-kategorinya.
    const ids = [filters.categoryId, ...categories.filter((c) => c.parent_id === filters.categoryId).map((c) => c.id)];
    query = query.in("category_id", ids);
  }
  if (filters.search) {
    query = query.ilike("note", `%${escapeLike(filters.search)}%`);
  }

  const { data, error } = await query.returns<TransactionRowLite[]>();
  const rows = data ?? [];

  // Dengan filter kategori/cari, baris biaya admin bisa tidak ikut terambil:
  // ambil terpisah agar tetap menempel ke transaksi induknya.
  let feeError: { code?: string } | null = null;
  if (filters.categoryId || filters.search) {
    const punyaFee = new Set(rows.map((r) => r.fee_for_id).filter(Boolean));
    const induk = rows.filter((r) => !r.fee_for_id && r.type !== "transfer_in" && !punyaFee.has(r.id)).map((r) => r.id);
    for (let i = 0; i < induk.length; i += 100) {
      const res = await supabase.from("transactions").select(KOLOM).in("fee_for_id", induk.slice(i, i + 100)).returns<TransactionRowLite[]>();
      if (res.error) feeError = res.error;
      rows.push(...(res.data ?? []));
    }
  }
  const firstError = accountsRes.error ?? categoriesRes.error ?? error ?? feeError;
  if (firstError) console.error("[transactions] daftar gagal", { code: firstError.code });

  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));
  const allCategoryOptions = categoryOptions(categories);
  const categoryLabels = new Map(allCategoryOptions.map((c) => [c.value, c.label]));

  const items = filterByAccount(toListItems(rows, accountNames, categoryLabels), filters.accountId);

  return {
    items,
    accountOptions: accounts.map((a) => ({ value: a.id, label: a.archived_at ? `${a.name} (diarsipkan)` : a.name })),
    categoryOptions: allCategoryOptions.map((c) => ({
      value: c.value,
      label: `${c.type === "income" ? "Pemasukan" : "Pengeluaran"}: ${c.label}`,
    })),
    error: firstError,
  };
}
