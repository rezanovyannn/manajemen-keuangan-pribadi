import type { Metadata } from "next";

import { createCategory } from "@/actions/categories";
import { CategoryForm } from "@/components/categories/category-form";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { categoryTypeParam, parseCategoryTypeParam } from "@/lib/categories/params";
import { categoryTypeLabel, compareCategoryName } from "@/lib/categories/tree";

export const metadata: Metadata = { title: "Tambah Kategori · Keuangan Pribadi" };

export default async function KategoriBaruPage({ searchParams }: PageProps<"/kategori/baru">) {
  const { tipe, induk } = await searchParams;
  const type = parseCategoryTypeParam(tipe);
  const { supabase } = await requireUser();

  // Calon induk: kategori utama yang aktif dengan tipe yang sama.
  const { data } = await supabase
    .from("categories")
    .select("id, name")
    .eq("type", type)
    .is("parent_id", null)
    .is("archived_at", null);
  const parents = (data ?? []).sort((a, b) => compareCategoryName(a.name, b.name));

  return (
    <div className="grid max-w-xl grid-cols-1">
      <PageHeader title={`Tambah kategori ${categoryTypeLabel(type).toLowerCase()}`} />
      <CategoryForm
        action={createCategory}
        cancelHref={`/kategori?tipe=${categoryTypeParam(type)}`}
        submitLabel="Simpan"
        create={{
          type,
          parents,
          defaultParentId: typeof induk === "string" ? induk : undefined,
        }}
      />
    </div>
  );
}
