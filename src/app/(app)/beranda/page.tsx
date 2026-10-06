import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FormAlert } from "@/components/auth/form-field";
import { AccountCashflowList } from "@/components/dashboard/account-cashflow";
import { ExpenseBreakdown } from "@/components/dashboard/expense-breakdown";
import { PeriodPicker } from "@/components/dashboard/period-picker";
import { SummaryTiles } from "@/components/dashboard/summary-tiles";
import { PageHeader } from "@/components/page-header";
import { RecurringSuggestions } from "@/components/recurring/suggestions";
import { AddTransactionButton } from "@/components/transactions/add-button";
import { requireUser } from "@/lib/auth/session";
import { loadMonthBudgets } from "@/lib/budgets/query";
import { loadDashboard } from "@/lib/dashboard/query";
import { loadDebts } from "@/lib/debts/query";
import { currentMonthInJakarta, resolvePeriod, todayInJakarta } from "@/lib/dates";
import { countBudgetAlerts, netWorth, totalBalance } from "@/lib/money";
import { loadSuggestions } from "@/lib/recurring/suggestions";

export const metadata: Metadata = { title: "Beranda · Keuangan Pribadi" };

const PESAN: Record<string, { tone: "success" | "error"; text: string }> = {
  dicatat: { tone: "success", text: "Transaksi dari jadwal tercatat." },
  "sudah-dicatat": { tone: "success", text: "Jadwal ini sudah pernah dicatat, tidak dibuat ganda." },
  dilewati: { tone: "success", text: "Jadwal dilewati untuk tanggal ini." },
  gagal: { tone: "error", text: "Perubahan gagal disimpan. Silakan coba lagi." },
};

function teks(v: string | string[] | undefined) {
  return typeof v === "string" ? v : undefined;
}

export default async function BerandaPage({ searchParams }: PageProps<"/beranda">) {
  const sp = await searchParams;
  const period = resolvePeriod({ periode: teks(sp.periode), dari: teks(sp.dari), sampai: teks(sp.sampai) });
  const month = currentMonthInJakarta();
  const today = todayInJakarta();
  const pesan = PESAN[teks(sp.status) ?? ""];
  const { supabase, user } = await requireUser();

  const [{ data: profile }, budgets, dash, saran, debts] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    loadMonthBudgets(supabase, month),
    loadDashboard(supabase, period),
    loadSuggestions(supabase, today),
    loadDebts(supabase),
  ]);
  const terbuka = debts.items.filter((d) => !d.archived && !d.status.settled);
  const nilaiBersih =
    dash.totalSaldo === null || debts.error
      ? null
      : netWorth({
          accounts: dash.totalSaldo,
          receivables: totalBalance(terbuka.filter((d) => d.kind === "piutang").map((d) => d.status.remaining)),
          payables: totalBalance(terbuka.filter((d) => d.kind === "utang").map((d) => d.status.remaining)),
        }).netWorth;
  const alerts = countBudgetAlerts(budgets.items.map((b) => b.usage));
  const bagian = [
    alerts.terlampaui > 0 && `${alerts.terlampaui} budget terlampaui`,
    alerts.hampir > 0 && `${alerts.hampir} budget hampir habis`,
  ].filter(Boolean);

  return (
    // pb-16: ruang agar konten terakhir tidak tertutup tombol + melayang
    <div className="grid max-w-xl grid-cols-1 gap-4 pb-16">
      <PageHeader title={`Halo, ${profile?.display_name ?? "pengguna baru"}!`} description={period.label} />

      <FormAlert tone={pesan?.tone ?? "success"} message={pesan?.text} />
      <RecurringSuggestions items={saran.items} today={today} />

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

      <SummaryTiles {...dash.summary} totalSaldo={dash.totalSaldo} netWorth={nilaiBersih} />

      <section aria-labelledby="judul-kategori" className="grid grid-cols-1 gap-3 rounded-xl border border-border p-4">
        <h2 id="judul-kategori" className="font-medium">
          Pengeluaran per kategori
        </h2>
        <ExpenseBreakdown {...dash.breakdown} />
      </section>

      <section aria-labelledby="judul-akun" className="grid grid-cols-1 gap-3">
        <h2 id="judul-akun" className="px-1 font-medium">
          Arus kas per akun
        </h2>
        <AccountCashflowList items={dash.perAkun} />
      </section>

      <AddTransactionButton />
    </div>
  );
}
