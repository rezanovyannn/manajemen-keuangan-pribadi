import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FormAlert } from "@/components/auth/form-field";
import { ExpenseBreakdown } from "@/components/dashboard/expense-breakdown";
import { PeriodPicker } from "@/components/dashboard/period-picker";
import { SummaryTiles } from "@/components/dashboard/summary-tiles";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { PageHeader } from "@/components/page-header";
import { AddTransactionButton } from "@/components/transactions/add-button";
import { requireUser } from "@/lib/auth/session";
import { loadMonthBudgets } from "@/lib/budgets/query";
import { BULAN_TREN, loadDashboard } from "@/lib/dashboard/query";
import { currentMonthInJakarta, resolvePeriod } from "@/lib/dates";
import { countBudgetAlerts } from "@/lib/money";

export const metadata: Metadata = { title: "Beranda · Keuangan Pribadi" };

function teks(v: string | string[] | undefined) {
  return typeof v === "string" ? v : undefined;
}

export default async function BerandaPage({ searchParams }: PageProps<"/beranda">) {
  const sp = await searchParams;
  const period = resolvePeriod({ periode: teks(sp.periode), dari: teks(sp.dari), sampai: teks(sp.sampai) });
  const month = currentMonthInJakarta();
  const { supabase, user } = await requireUser();

  const [{ data: profile }, budgets, dash] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    loadMonthBudgets(supabase, month),
    loadDashboard(supabase, period),
  ]);
  const alerts = countBudgetAlerts(budgets.items.map((b) => b.usage));
  const bagian = [
    alerts.terlampaui > 0 && `${alerts.terlampaui} budget terlampaui`,
    alerts.hampir > 0 && `${alerts.hampir} budget hampir habis`,
  ].filter(Boolean);

  return (
    // pb-16: ruang agar konten terakhir tidak tertutup tombol + melayang
    <div className="grid max-w-xl grid-cols-1 gap-4 pb-16">
      <PageHeader title={`Halo, ${profile?.display_name ?? "pengguna baru"}!`} description={period.label} />

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

      <PeriodPicker period={period} />
      <FormAlert tone="error" message={dash.error ? "Sebagian data gagal dimuat. Coba muat ulang halaman." : undefined} />

      <SummaryTiles {...dash.summary} totalSaldo={dash.totalSaldo} />

      <section aria-labelledby="judul-kategori" className="grid grid-cols-1 gap-3 rounded-xl border border-border p-4">
        <h2 id="judul-kategori" className="font-medium">
          Pengeluaran per kategori
        </h2>
        <ExpenseBreakdown {...dash.breakdown} />
      </section>

      <section aria-labelledby="judul-tren" className="grid grid-cols-1 gap-3 rounded-xl border border-border p-4">
        <h2 id="judul-tren" className="font-medium">
          Tren {BULAN_TREN} bulan
        </h2>
        <TrendChart data={dash.trend} />
      </section>

      <AddTransactionButton />
    </div>
  );
}
