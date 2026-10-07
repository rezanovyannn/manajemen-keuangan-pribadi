import type { Metadata } from "next";

import { createRule } from "@/actions/recurring";
import { PageHeader } from "@/components/page-header";
import { RecurringForm } from "@/components/recurring/recurring-form";
import { requireUser } from "@/lib/auth/session";
import { todayInJakarta } from "@/lib/dates";
import { loadTransactionFormOptions } from "@/lib/transactions/options";

export const metadata: Metadata = { title: "Tambah Jadwal · Keuangan Pribadi" };

export default async function BerulangBaruPage() {
  const { supabase } = await requireUser();
  const { accounts, categories } = await loadTransactionFormOptions(supabase);

  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-1">
      <PageHeader title="Tambah jadwal berulang" />
      <RecurringForm
        action={createRule}
        accounts={accounts}
        categories={categories}
        initial={{ type: "expense", frequency: "monthly", startDate: todayInJakarta(), accountId: accounts[0]?.value ?? "" }}
        submitLabel="Simpan"
      />
    </div>
  );
}
