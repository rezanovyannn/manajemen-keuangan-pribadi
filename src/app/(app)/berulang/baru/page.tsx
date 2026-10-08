import type { Metadata } from "next";

import { createRule } from "@/actions/recurring";
import { PageHeader } from "@/components/page-header";
import { RecurringForm } from "@/components/recurring/recurring-form";
import { requireUser } from "@/lib/auth/session";
import { todayInJakarta } from "@/lib/dates";
import { nextMonthlyDate } from "@/lib/money";
import { loadTransactionFormOptions } from "@/lib/transactions/options";
import { idSchema } from "@/lib/validators/common";

export const metadata: Metadata = { title: "Tambah Jadwal · Keuangan Pribadi" };

export default async function BerulangBaruPage({ searchParams }: PageProps<"/berulang/baru">) {
  const { dariTransaksi } = await searchParams;
  const { supabase } = await requireUser();

  // Dari insight "Kemungkinan langganan": isi form dari transaksi terakhir (lewat id,
  // agar nominal/nama tidak tampil di URL). RLS menjamin hanya transaksi milik pengguna.
  const sumber =
    typeof dariTransaksi === "string" && idSchema.safeParse(dariTransaksi).success
      ? (
          await supabase
            .from("transactions")
            .select("account_id, category_id, amount, occurred_on, note")
            .eq("id", dariTransaksi)
            .eq("type", "expense")
            .maybeSingle()
        ).data
      : null;

  const { accounts, categories } = await loadTransactionFormOptions(
    supabase,
    sumber ? [sumber.account_id, sumber.category_id ?? ""].filter(Boolean) : [],
  );

  const initial: Record<string, string> = sumber
    ? {
        type: "expense",
        frequency: "monthly",
        name: (sumber.note ?? "").trim().slice(0, 50),
        amount: String(sumber.amount),
        accountId: sumber.account_id,
        categoryId: sumber.category_id ?? "",
        startDate: nextMonthlyDate(sumber.occurred_on),
        note: sumber.note ?? "",
      }
    : { type: "expense", frequency: "monthly", startDate: todayInJakarta(), accountId: accounts[0]?.value ?? "" };

  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-1">
      <PageHeader
        title="Tambah jadwal berulang"
        description={sumber ? "Diisi dari transaksi terakhir. Periksa lalu simpan." : undefined}
      />
      <RecurringForm action={createRule} accounts={accounts} categories={categories} initial={initial} submitLabel="Simpan" />
    </div>
  );
}
