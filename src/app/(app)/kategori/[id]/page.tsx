import { Archive, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { renameCategory, setCategoryArchived } from "@/actions/categories";
import { CategoryForm } from "@/components/categories/category-form";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { categoryTypeParam } from "@/lib/categories/params";
import { categoryTypeLabel } from "@/lib/categories/tree";
import { cn } from "@/lib/utils";
import { idSchema } from "@/lib/validators/common";

export const metadata: Metadata = { title: "Ubah Kategori · Keuangan Pribadi" };

export default async function UbahKategoriPage({ params }: PageProps<"/kategori/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const { supabase } = await requireUser();
  const { data: category } = await supabase
    .from("categories")
    .select("id, parent_id, name, type, archived_at")
    .eq("id", id)
    .maybeSingle();
  // RLS: kategori milik pengguna lain tidak akan ditemukan.
  if (!category || category.archived_at) notFound();

  const daftarHref = `/kategori?tipe=${categoryTypeParam(category.type)}`;
  const isRoot = !category.parent_id;

  return (
    <div className="grid max-w-xl gap-8">
      <div>
        <PageHeader
          title="Ubah kategori"
          description={`${categoryTypeLabel(category.type)}${isRoot ? "" : " · sub-kategori"}`}
        />
        <CategoryForm
          action={renameCategory.bind(null, category.id, category.type)}
          cancelHref={daftarHref}
          submitLabel="Simpan perubahan"
          initialName={category.name}
        />
      </div>

      {isRoot && (
        <Link
          href={`/kategori/baru?tipe=${categoryTypeParam(category.type)}&induk=${category.id}`}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 sm:justify-self-start")}
        >
          <Plus aria-hidden />
          Tambah sub-kategori
        </Link>
      )}

      <form
        action={setCategoryArchived.bind(null, category.id, category.type, true)}
        className="grid gap-2 rounded-xl border border-border p-4"
      >
        <p className="text-sm text-muted-foreground">
          Kategori yang diarsipkan{isRoot ? " (beserta sub-kategorinya)" : ""} disembunyikan dari
          pilihan, tapi riwayatnya tetap tersimpan dan bisa dipulihkan kapan saja.
        </p>
        <Button type="submit" variant="destructive" size="lg" className="h-10 sm:justify-self-start">
          <Archive aria-hidden />
          Arsipkan kategori
        </Button>
      </form>
    </div>
  );
}
