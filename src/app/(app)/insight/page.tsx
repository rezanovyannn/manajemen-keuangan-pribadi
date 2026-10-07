import type { Metadata } from "next";

import { FormAlert } from "@/components/auth/form-field";
import { CashflowProjectionSection } from "@/components/insight/cashflow-projection";
import { SafeToSpendCard } from "@/components/insight/safe-to-spend-card";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { todayInJakarta } from "@/lib/dates";
import { loadProjection } from "@/lib/insight/query";

export const metadata: Metadata = { title: "Insight · Keuangan Pribadi" };

export default async function InsightPage() {
  const { supabase } = await requireUser();
  const data = await loadProjection(supabase, todayInJakarta());

  return (
    <div className="grid max-w-xl grid-cols-1 gap-4">
      <PageHeader title="Insight & proyeksi" description="Perkiraan dari saldo, jadwal berulang, dan budget bulan ini." />
      {data.error ? (
        <FormAlert tone="error" message="Data gagal dimuat. Coba muat ulang halaman." />
      ) : (
        <>
          <SafeToSpendCard safe={data.safe} detail />
          <CashflowProjectionSection
            projection={data.projection}
            monthEnd={data.monthEnd}
            accountNames={data.accountNames}
            hasRules={data.hasRules}
          />
        </>
      )}
    </div>
  );
}
