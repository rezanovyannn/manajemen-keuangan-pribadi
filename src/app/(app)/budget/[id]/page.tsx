import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { deleteBudget, updateBudget } from "@/actions/budgets";
import { BudgetForm } from "@/components/budgets/budget-form";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { categoryOptions } from "@/lib/categories/options";
import { formatBulan } from "@/lib/dates";
import { idSchema } from "@/lib/validators/common";

export const metadata: Metadata = { title: "Ubah Budget · Keuangan Pribadi" };

export default async function UbahBudgetPage({ params }: PageProps<"/budget/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const { supabase } = await requireUser();
  // RLS: budget milik pengguna lain tidak akan ditemukan.
  const { data: budget } = await supabase
    .from("budgets")
    .select("id, category_id, month, amount")
    .eq("id", id)
    .maybeSingle();
  if (!budget) notFound();

  const { data: categories } = await supabase.from("categories").select("id, parent_id, name, type, archived_at");
  const label = categoryOptions(categories ?? []).find((c) => c.value === budget.category_id)?.label ?? "Kategori";
  const month = budget.month.slice(0, 7);

  return (
    <div className="grid max-w-xl gap-8">
      <div>
        <PageHeader title={`Budget ${label}`} description={formatBulan(month)} />
        <BudgetForm
          action={updateBudget.bind(null, budget.id, month)}
          cancelHref={`/budget?bulan=${month}`}
          submitLabel="Simpan perubahan"
          initialAmount={String(budget.amount)}
        />
      </div>

      <div className="grid gap-2 rounded-xl border border-border p-4">
        <ConfirmDeleteButton
          action={deleteBudget.bind(null, budget.id, month)}
          label="Hapus budget"
          message={`Yakin hapus budget ${label} untuk ${formatBulan(month)}? Transaksi tidak ikut terhapus.`}
        />
      </div>
    </div>
  );
}
