import type { Metadata } from "next";
import Link from "next/link";

import { createBudget } from "@/actions/budgets";
import { BudgetForm } from "@/components/budgets/budget-form";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { loadBudgetCategoryOptions } from "@/lib/budgets/query";
import { currentMonthInJakarta, formatBulan, isValidMonthString } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tambah Budget · Keuangan Pribadi" };

export default async function BudgetBaruPage({ searchParams }: PageProps<"/budget/baru">) {
  const { bulan } = await searchParams;
  const month = typeof bulan === "string" && isValidMonthString(bulan) ? bulan : currentMonthInJakarta();
  const { supabase } = await requireUser();
  const categories = await loadBudgetCategoryOptions(supabase, month);
  const kembali = `/budget?bulan=${month}`;

  return (
    <div className="grid max-w-xl grid-cols-1">
      <PageHeader title="Tambah budget" description={formatBulan(month)} />
      {categories.length === 0 ? (
        <div className="grid justify-items-center gap-4 rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          Semua kategori pengeluaran sudah punya budget di bulan ini.
          <Link href={kembali} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10")}>
            Kembali
          </Link>
        </div>
      ) : (
        <BudgetForm action={createBudget} cancelHref={kembali} submitLabel="Simpan" create={{ month, categories }} />
      )}
    </div>
  );
}
