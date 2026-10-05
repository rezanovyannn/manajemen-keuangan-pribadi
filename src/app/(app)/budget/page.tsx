import { Copy, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { copyBudgetsFromPreviousMonth } from "@/actions/budgets";
import { FormAlert } from "@/components/auth/form-field";
import { BudgetCard } from "@/components/budgets/budget-card";
import { MonthNav } from "@/components/month-nav";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { loadMonthBudgets } from "@/lib/budgets/query";
import { currentMonthInJakarta, isValidMonthString } from "@/lib/dates";
import { BUDGET_WARNING_PERCENT } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Budget · Keuangan Pribadi" };

const PESAN: Record<string, { tone: "success" | "error"; text: string }> = {
  tersimpan: { tone: "success", text: "Budget tersimpan." },
  diubah: { tone: "success", text: "Perubahan tersimpan." },
  dihapus: { tone: "success", text: "Budget dihapus." },
  disalin: { tone: "success", text: "Budget bulan lalu sudah disalin." },
  gagal: { tone: "error", text: "Perubahan gagal disimpan. Silakan coba lagi." },
};

export default async function BudgetPage({ searchParams }: PageProps<"/budget">) {
  const { bulan, status } = await searchParams;
  const month = typeof bulan === "string" && isValidMonthString(bulan) ? bulan : currentMonthInJakarta();
  const { supabase } = await requireUser();
  const { items, copyable, error } = await loadMonthBudgets(supabase, month);
  const pesan = typeof status === "string" ? PESAN[status] : undefined;

  return (
    <div className="grid max-w-xl grid-cols-1 gap-4">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Budget" description="Batas pengeluaran bulanan per kategori." />
        <Link href={`/budget/baru?bulan=${month}`} className={cn(buttonVariants({ size: "lg" }), "h-10 shrink-0")}>
          <Plus aria-hidden />
          Tambah
        </Link>
      </div>

      <FormAlert tone={pesan?.tone ?? "success"} message={pesan?.text} />
      <FormAlert tone="error" message={error ? "Budget gagal dimuat." : undefined} />

      <MonthNav month={month} href={(m) => `/budget?bulan=${m}`} />

      {copyable > 0 && (
        <form action={copyBudgetsFromPreviousMonth.bind(null, month)}>
          <Button type="submit" variant="outline" size="lg" className="h-10 w-full">
            <Copy aria-hidden />
            Salin {copyable} budget dari bulan lalu
          </Button>
        </form>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          Belum ada budget di bulan ini.
        </div>
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <BudgetCard item={item} month={month} />
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Peringatan &quot;Hampir habis&quot; muncul mulai {BUDGET_WARNING_PERCENT}% terpakai. Budget kategori utama ikut
        menghitung sub-kategorinya.
      </p>
    </div>
  );
}
