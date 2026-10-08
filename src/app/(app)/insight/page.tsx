import type { Metadata } from "next";

import { FormAlert } from "@/components/auth/form-field";
import { CashflowProjectionSection } from "@/components/insight/cashflow-projection";
import { InsightCards } from "@/components/insight/insight-cards";
import { SafeToSpendCard } from "@/components/insight/safe-to-spend-card";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { todayInJakarta } from "@/lib/dates";
import { loadInsights } from "@/lib/insight/insights";
import { loadProjection } from "@/lib/insight/query";

export const metadata: Metadata = { title: "Insight · Keuangan Pribadi" };

export default async function InsightPage() {
  const { supabase } = await requireUser();
  const today = todayInJakarta();
  const [data, insights] = await Promise.all([loadProjection(supabase, today), loadInsights(supabase, today)]);

  return (
    <div className="grid w-full grid-cols-1 gap-4 lg:gap-5">
      <PageHeader title="Insight & proyeksi" description="Perkiraan dari saldo, jadwal berulang, dan budget bulan ini." />
      {data.error ? (
        <FormAlert tone="error" message="Data gagal dimuat. Coba muat ulang halaman." />
      ) : (
        // Desktop: kartu "aman dibelanjakan" di kiri (menempel saat digulir), proyeksi di kanan.
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-5">
          <div className="lg:sticky lg:top-10">
            <SafeToSpendCard safe={data.safe} detail />
          </div>
          <CashflowProjectionSection
            projection={data.projection}
            monthEnd={data.monthEnd}
            accountNames={data.accountNames}
            hasRules={data.hasRules}
          />
        </div>
      )}
      {insights.error ? (
        <FormAlert tone="error" message="Insight gagal dimuat. Coba muat ulang halaman." />
      ) : (
        <InsightCards data={insights} today={today} />
      )}
    </div>
  );
}
