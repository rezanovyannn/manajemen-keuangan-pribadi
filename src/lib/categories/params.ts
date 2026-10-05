import type { CategoryType } from "@/lib/supabase/database.types";

// Tipe kategori di URL memakai kata Bahasa Indonesia: ?tipe=pengeluaran / ?tipe=pemasukan.
export function categoryTypeParam(type: CategoryType) {
  return type === "income" ? "pemasukan" : "pengeluaran";
}

export function parseCategoryTypeParam(value: string | string[] | undefined): CategoryType {
  return value === "pemasukan" ? "income" : "expense";
}
