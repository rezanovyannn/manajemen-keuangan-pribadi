import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, SegeraHadir } from "@/components/page-header";
import { AddTransactionButton } from "@/components/transactions/add-button";
import { requireUser } from "@/lib/auth/session";
import { loadMonthBudgets } from "@/lib/budgets/query";
import { currentMonthInJakarta } from "@/lib/dates";
import { countBudgetAlerts } from "@/lib/money";

export const metadata: Metadata = { title: "Beranda · Keuangan Pribadi" };

export default async function BerandaPage() {
  const { supabase, user } = await requireUser();
  const month = currentMonthInJakarta();

  const [{ data: profile }, budgets] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    loadMonthBudgets(supabase, month),
  ]);
  const alerts = countBudgetAlerts(budgets.items.map((b) => b.usage));
  const bagian = [
    alerts.terlampaui > 0 && `${alerts.terlampaui} budget terlampaui`,
    alerts.hampir > 0 && `${alerts.hampir} budget hampir habis`,
  ].filter(Boolean);

  return (
    <div className="grid max-w-xl grid-cols-1 gap-4">
      <PageHeader
        title={`Halo, ${profile?.display_name ?? "pengguna baru"}!`}
        description="Ringkasan keuanganmu akan tampil di sini."
      />
      {bagian.length > 0 && (
        <section aria-label="Peringatan budget">
          <Link
            href={`/budget?bulan=${month}`}
            className="flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <TriangleAlert className="size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            <span className="flex-1">
              <span className="font-medium">{bagian.join(" · ")}</span> bulan ini. Lihat budget
            </span>
          </Link>
        </section>
      )}
      <SegeraHadir fase="Fase 5: dashboard" />
      <AddTransactionButton />
    </div>
  );
}
