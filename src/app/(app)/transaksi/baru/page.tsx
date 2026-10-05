import type { Metadata } from "next";
import Link from "next/link";

import { createTransaction } from "@/actions/transactions";
import { PageHeader } from "@/components/page-header";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { todayInJakarta } from "@/lib/dates";
import { loadTransactionFormOptions } from "@/lib/transactions/options";
import { cn } from "@/lib/utils";
import type { TransactionFormType } from "@/lib/validators/transaction";

export const metadata: Metadata = { title: "Tambah Transaksi · Keuangan Pribadi" };

function asType(v: unknown): TransactionFormType {
  return v === "income" || v === "transfer" ? v : "expense";
}

export default async function TransaksiBaruPage({ searchParams }: PageProps<"/transaksi/baru">) {
  const { tipe, akun, tersimpan } = await searchParams;
  const { supabase } = await requireUser();
  const { accounts, categories } = await loadTransactionFormOptions(supabase);

  if (accounts.length === 0) {
    return (
      <div className="grid max-w-xl gap-4">
        <PageHeader title="Tambah transaksi" />
        <div className="grid justify-items-center gap-4 rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          Buat akun atau dompet dulu sebelum mencatat transaksi.
          <Link href="/akun/baru" className={cn(buttonVariants({ size: "lg" }), "h-10")}>
            Tambah akun
          </Link>
        </div>
      </div>
    );
  }

  const accountId = typeof akun === "string" ? akun : accounts[0]?.value;

  return (
    <div className="grid max-w-xl">
      <PageHeader title="Tambah transaksi" />
      <TransactionForm
        action={createTransaction}
        accounts={accounts}
        categories={categories}
        initial={{ type: asType(tipe), accountId, fromAccountId: accountId, occurredOn: todayInJakarta() }}
        submitLabel="Simpan"
        cancelHref="/transaksi"
        allowContinue
        notice={tersimpan === "1" ? "Transaksi tersimpan. Silakan catat berikutnya." : undefined}
      />
    </div>
  );
}
