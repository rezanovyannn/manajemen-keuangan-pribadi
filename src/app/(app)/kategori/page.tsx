import { ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { setCategoryArchived } from "@/actions/categories";
import { FormAlert } from "@/components/auth/form-field";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { categoryTypeParam, parseCategoryTypeParam } from "@/lib/categories/params";
import { buildCategoryTree, CATEGORY_TYPES } from "@/lib/categories/tree";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Kategori · Keuangan Pribadi" };

const PESAN_GAGAL: Record<string, string> = {
  nama: "Kategori tidak bisa dipulihkan karena namanya sudah dipakai kategori aktif lain.",
  arsip: "Perubahan gagal disimpan. Silakan coba lagi.",
};

export default async function KategoriPage({ searchParams }: PageProps<"/kategori">) {
  const { tipe, gagal } = await searchParams;
  const type = parseCategoryTypeParam(tipe);
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, name, type, archived_at");
  if (error) console.error("[categories] daftar gagal", { code: error.code });

  const rows = data ?? [];
  const aktif = buildCategoryTree(rows.filter((c) => !c.archived_at), type);
  const arsip = rows.filter((c) => c.archived_at && c.type === type);

  return (
    <div className="grid w-full max-w-3xl grid-cols-1 gap-4 lg:gap-5">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Kategori" description="Kelompokkan pemasukan dan pengeluaran." />
        <Link
          href={`/kategori/baru?tipe=${categoryTypeParam(type)}`}
          className={cn(buttonVariants({ size: "lg" }), "h-10 shrink-0")}
        >
          <Plus aria-hidden />
          Tambah
        </Link>
      </div>

      <nav aria-label="Tipe kategori" className="grid grid-cols-2 rounded-lg border border-border bg-card p-0.5 lg:max-w-sm">
        {CATEGORY_TYPES.map((t) => (
          <Link
            key={t.value}
            href={`/kategori?tipe=${categoryTypeParam(t.value)}`}
            aria-current={t.value === type ? "page" : undefined}
            className={cn(
              "flex h-9 items-center justify-center rounded-md text-sm font-medium text-muted-foreground",
              t.value === type && "bg-muted text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <FormAlert
        tone="error"
        message={
          error ? "Daftar kategori gagal dimuat." : typeof gagal === "string" ? PESAN_GAGAL[gagal] : undefined
        }
      />

      {aktif.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          Belum ada kategori.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {aktif.map((c) => (
            <li key={c.id}>
              <KategoriLink id={c.id} name={c.name} />
              {c.children.length > 0 && (
                <ul className="pb-2">
                  {c.children.map((child) => (
                    <li key={child.id}>
                      <KategoriLink id={child.id} name={child.name} sub />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {arsip.length > 0 && (
        <details className="rounded-xl border border-border bg-card">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-muted-foreground">
            Diarsipkan ({arsip.length})
          </summary>
          <ul className="divide-y divide-border border-t border-border">
            {arsip.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <p className="min-w-0 flex-1 truncate text-muted-foreground">{c.name}</p>
                <form action={setCategoryArchived.bind(null, c.id, type, false)}>
                  <Button type="submit" variant="outline" size="sm">
                    Pulihkan
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function KategoriLink({ id, name, sub }: { id: string; name: string; sub?: boolean }) {
  return (
    <Link
      href={`/kategori/${id}`}
      className={cn(
        "flex items-center gap-3 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted",
        sub && "py-2 pl-9 text-sm text-muted-foreground",
      )}
    >
      <span className={cn("min-w-0 flex-1 truncate", !sub && "font-medium")}>{name}</span>
      <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
    </Link>
  );
}
