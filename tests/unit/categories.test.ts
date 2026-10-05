import { describe, expect, it } from "vitest";

import { categoryTypeParam, parseCategoryTypeParam } from "@/lib/categories/params";
import { buildCategoryTree, compareCategoryName, type CategoryItem } from "@/lib/categories/tree";
import { categoryNameSchema, categorySchema } from "@/lib/validators/category";

const UUID = "3f1c2b5e-8d4a-4c1e-9b7a-2e6f0d9c8a11";

function kat(id: string, name: string, extra: Partial<CategoryItem> = {}): CategoryItem {
  return { id, name, parent_id: null, type: "expense", archived_at: null, ...extra };
}

describe("compareCategoryName", () => {
  it("mengurutkan abjad dengan 'Lainnya' di akhir", () => {
    const names = ["Lainnya", "Transportasi", "belanja", "Makan & Minum"];
    expect(names.sort(compareCategoryName)).toEqual(["belanja", "Makan & Minum", "Transportasi", "Lainnya"]);
  });
});

describe("buildCategoryTree", () => {
  const items = [
    kat("1", "Transportasi"),
    kat("2", "Makan & Minum"),
    kat("3", "Kopi", { parent_id: "2" }),
    kat("4", "Bensin", { parent_id: "1" }),
    kat("5", "Ojek online", { parent_id: "1" }),
    kat("6", "Gaji", { type: "income" }),
    kat("7", "Parkir", { parent_id: "hilang" }),
  ];

  it("mengelompokkan sub-kategori di bawah induknya, terurut", () => {
    const tree = buildCategoryTree(items, "expense");
    expect(tree.map((c) => c.name)).toEqual(["Makan & Minum", "Parkir", "Transportasi"]);
    expect(tree[2]?.children.map((c) => c.name)).toEqual(["Bensin", "Ojek online"]);
    expect(tree[0]?.children.map((c) => c.name)).toEqual(["Kopi"]);
  });

  it("hanya memuat tipe yang diminta", () => {
    expect(buildCategoryTree(items, "income").map((c) => c.name)).toEqual(["Gaji"]);
  });

  it("menampilkan sub-kategori yatim sebagai kategori utama", () => {
    const parkir = buildCategoryTree(items, "expense").find((c) => c.id === "7");
    expect(parkir?.children).toEqual([]);
  });
});

describe("categorySchema", () => {
  it("mengubah induk kosong menjadi null", () => {
    expect(categorySchema.parse({ name: " Kopi ", type: "expense", parentId: "" })).toEqual({
      name: "Kopi",
      type: "expense",
      parentId: null,
    });
  });

  it("menerima induk UUID dan menolak induk tidak valid", () => {
    expect(categorySchema.parse({ name: "Kopi", type: "expense", parentId: UUID }).parentId).toBe(UUID);
    expect(categorySchema.safeParse({ name: "Kopi", type: "expense", parentId: "abc" }).success).toBe(false);
  });

  it("menolak tipe tidak dikenal dan nama terlalu panjang", () => {
    expect(categorySchema.safeParse({ name: "Kopi", type: "transfer", parentId: "" }).success).toBe(false);
    expect(categoryNameSchema.safeParse({ name: "a".repeat(51) }).success).toBe(false);
  });
});

describe("parameter tipe di URL", () => {
  it("bolak-balik antara tipe dan kata di URL", () => {
    expect(categoryTypeParam("income")).toBe("pemasukan");
    expect(parseCategoryTypeParam("pemasukan")).toBe("income");
    expect(parseCategoryTypeParam("pengeluaran")).toBe("expense");
    expect(parseCategoryTypeParam(undefined)).toBe("expense");
    expect(parseCategoryTypeParam(["pemasukan"])).toBe("expense");
  });
});
