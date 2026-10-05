import type { CategoryType } from "@/lib/supabase/database.types";

import { buildCategoryTree, CATEGORY_TYPE_VALUES, type CategoryItem } from "./tree";

export type CategoryOption = { value: string; label: string; type: CategoryType };

// Ubah pohon kategori menjadi pilihan datar: "Makan & Minum", "Makan & Minum › Kopi", ...
export function categoryOptions(items: CategoryItem[]): CategoryOption[] {
  return CATEGORY_TYPE_VALUES.flatMap((type) =>
    buildCategoryTree(items, type).flatMap((root) => [
      { value: root.id, label: root.name, type },
      ...root.children.map((c) => ({ value: c.id, label: `${root.name} › ${c.name}`, type })),
    ]),
  );
}
