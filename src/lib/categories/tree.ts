import type { CategoryType } from "@/lib/supabase/database.types";

export const CATEGORY_TYPES: { value: CategoryType; label: string }[] = [
  { value: "expense", label: "Pengeluaran" },
  { value: "income", label: "Pemasukan" },
];

export const CATEGORY_TYPE_VALUES = ["income", "expense"] as const satisfies readonly CategoryType[];

export function categoryTypeLabel(type: CategoryType) {
  return CATEGORY_TYPES.find((t) => t.value === type)?.label ?? type;
}

export type CategoryItem = {
  id: string;
  parent_id: string | null;
  name: string;
  type: CategoryType;
  archived_at: string | null;
};

export type CategoryNode<T extends CategoryItem = CategoryItem> = T & { children: T[] };

// "Lainnya" selalu di akhir, sisanya urut abjad (bahasa Indonesia).
export function compareCategoryName(a: string, b: string) {
  const lainA = a.toLowerCase() === "lainnya";
  const lainB = b.toLowerCase() === "lainnya";
  if (lainA !== lainB) return lainA ? 1 : -1;
  return a.localeCompare(b, "id", { sensitivity: "base" });
}

// Susun daftar datar menjadi pohon satu tingkat untuk satu tipe.
// Sub-kategori yang induknya tidak ada di daftar (misal induk diarsipkan) ditampilkan sebagai kategori utama.
export function buildCategoryTree<T extends CategoryItem>(items: T[], type: CategoryType): CategoryNode<T>[] {
  const ofType = items.filter((c) => c.type === type);
  const ids = new Set(ofType.map((c) => c.id));
  const byName = (x: T, y: T) => compareCategoryName(x.name, y.name);

  return ofType
    .filter((c) => !c.parent_id || !ids.has(c.parent_id))
    .sort(byName)
    .map((root) => ({
      ...root,
      children: ofType.filter((c) => c.parent_id === root.id).sort(byName),
    }));
}
