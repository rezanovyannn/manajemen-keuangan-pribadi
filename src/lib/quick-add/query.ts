import "server-only";

import { categoryEmoji } from "@/lib/categories/emoji";
import { categoryOptions } from "@/lib/categories/options";
import { todayInJakarta } from "@/lib/dates";
import type { AccountType } from "@/lib/supabase/database.types";
import type { createClient } from "@/lib/supabase/server";

import { buildCategoryModel, favorites, lastAccountId, rankCategories, type CategoryModel, type Favorite, type HistoryRow } from "./learn";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Riwayat yang dipelajari: 500 pemasukan/pengeluaran terbaru (tanpa baris biaya admin).
const BATAS_RIWAYAT = 500;

export type QuickAddCategory = { id: string; label: string; type: "expense" | "income"; emoji: string };

export type QuickAddData = {
  today: string;
  accounts: { id: string; name: string; type: AccountType }[];
  categories: QuickAddCategory[]; // urut paling sering dipakai per tipe
  model: CategoryModel;
  favorites: Favorite[];
  lastAccountId: string | null;
};

export async function loadQuickAddData(supabase: Supabase): Promise<QuickAddData | null> {
  const [accountsRes, categoriesRes, historyRes] = await Promise.all([
    // Catat kilat untuk belanja/pemasukan harian: akun investasi tidak ditampilkan.
    supabase.from("accounts").select("id, name, type").is("archived_at", null).neq("type", "investment").order("created_at"),
    supabase.from("categories").select("id, parent_id, name, type, archived_at").is("archived_at", null),
    supabase
      .from("transactions")
      .select("type, amount, account_id, category_id, note, occurred_on, created_at, debt_id")
      .in("type", ["expense", "income"])
      .is("fee_for_id", null)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(BATAS_RIWAYAT),
  ]);
  const error = accountsRes.error ?? categoriesRes.error ?? historyRes.error;
  if (error) {
    console.error("[catat-kilat] muat gagal", { code: error.code });
    return null;
  }

  const accounts = accountsRes.data ?? [];
  const aktif = new Set(accounts.map((a) => a.id));
  const kategori = categoriesRes.data ?? [];
  const aktifKat = new Set(kategori.map((c) => c.id));
  // Hanya riwayat yang akun & kategorinya masih aktif yang dipakai untuk saran.
  const rows = (historyRes.data ?? []).filter(
    (r): r is HistoryRow & { debt_id: string | null } =>
      (r.type === "expense" || r.type === "income") && r.category_id !== null && aktifKat.has(r.category_id),
  );

  const opsi = categoryOptions(kategori);
  const namaInduk = new Map(kategori.map((c) => [c.id, c.parent_id ? (kategori.find((p) => p.id === c.parent_id)?.name ?? c.name) : c.name]));
  const categories: QuickAddCategory[] = (["expense", "income"] as const).flatMap((type) => {
    const ids = opsi.filter((o) => o.type === type).map((o) => o.value);
    return rankCategories(rows, ids, type).map((id) => {
      const o = opsi.find((x) => x.value === id)!;
      return { id, label: o.label, type, emoji: categoryEmoji(kategori.find((c) => c.id === id)?.name ?? namaInduk.get(id) ?? "") };
    });
  });

  return {
    today: todayInJakarta(),
    accounts,
    categories,
    model: buildCategoryModel(rows),
    // Cicilan/pelunasan utang tidak dijadikan favorit: harus dicatat lewat halaman utang agar sisa ikut berkurang.
    favorites: favorites(rows.filter((r) => r.debt_id === null)).filter((f) => aktif.has(f.accountId)),
    lastAccountId: lastAccountId(rows, aktif) ?? accounts[0]?.id ?? null,
  };
}
