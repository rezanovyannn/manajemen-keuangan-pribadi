import type { Metadata } from "next";

import { FormAlert } from "@/components/auth/form-field";
import { PageHeader } from "@/components/page-header";
import { AddTransactionButton } from "@/components/transactions/add-button";
import { MonthNav, TransactionFiltersForm } from "@/components/transactions/transaction-filters";
import { TransactionList } from "@/components/transactions/transaction-list";
import { requireUser } from "@/lib/auth/session";
import { currentMonthInJakarta, isValidMonthString } from "@/lib/dates";
import { formatRupiah, summarizeIncomeExpense } from "@/lib/money";
import { loadMonthTransactions, type TransactionFilters } from "@/lib/transactions/query";
import { cn } from "@/lib/utils";
import { idSchema } from "@/lib/validators/common";

export const metadata: Metadata = { title: "Transaksi · Keuangan Pribadi" };

const PESAN: Record<string, { tone: "success" | "error"; text: string }> = {
  tersimpan: { tone: "success", text: "Transaksi tersimpan." },
  diubah: { tone: "success", text: "Perubahan tersimpan." },
  dihapus: { tone: "success", text: "Transaksi dihapus." },
};

function teks(v: string | string[] | undefined) {
  return typeof v === "string" ? v.trim() : "";
}

export default async function TransaksiPage({ searchParams }: PageProps<"/transaksi">) {
  const sp = await searchParams;
  const { supabase } = await requireUser();

  const bulan = teks(sp.bulan);
  const akun = teks(sp.akun);
  const kategori = teks(sp.kategori);
  const filters: TransactionFilters = {
    month: isValidMonthString(bulan) ? bulan : currentMonthInJakarta(),
    accountId: idSchema.safeParse(akun).success ? akun : undefined,
    categoryId: idSchema.safeParse(kategori).success ? kategori : undefined,
    search: teks(sp.cari).slice(0, 100) || undefined,
  };

  const { items, accountOptions, categoryOptions, error } = await loadMonthTransactions(supabase, filters);
  const ringkasan = summarizeIncomeExpense(items.map((i) => ({ type: i.kind, amount: i.amount })));
  const pesan = sp.tersimpan === "1" ? PESAN.tersimpan : PESAN[teks(sp.status)];

  return (
    // pb-16: ruang agar baris terakhir tidak tertutup tombol + melayang
    <div className="grid max-w-xl gap-4 pb-16">
      <PageHeader title="Transaksi" />
      <FormAlert tone={pesan?.tone ?? "success"} message={pesan?.text} />
      <FormAlert tone="error" message={error ? "Daftar transaksi gagal dimuat." : undefined} />

      <MonthNav filters={filters} />

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Ringkas label="Pemasukan" value={ringkasan.income} className="text-emerald-700 dark:text-emerald-400" />
        <Ringkas label="Pengeluaran" value={ringkasan.expense} className="text-rose-700 dark:text-rose-400" />
        <Ringkas label="Selisih" value={ringkasan.net} />
      </dl>

      <TransactionFiltersForm filters={filters} accounts={accountOptions} categories={categoryOptions} />

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          Belum ada transaksi di periode ini.
        </div>
      ) : (
        <TransactionList items={items} />
      )}

      <AddTransactionButton />
    </div>
  );
}

function Ringkas({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-xl border border-border px-2 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-1 text-sm font-semibold tabular-nums", className)}>{formatRupiah(value)}</dd>
    </div>
  );
}
