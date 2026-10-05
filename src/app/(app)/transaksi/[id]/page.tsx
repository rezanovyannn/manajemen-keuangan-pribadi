import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { deleteTransaction, updateTransaction, type EditTarget } from "@/actions/transactions";
import { FormAlert } from "@/components/auth/form-field";
import { PageHeader } from "@/components/page-header";
import { DeleteTransactionButton } from "@/components/transactions/delete-button";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { requireUser } from "@/lib/auth/session";
import { loadTransactionFormOptions } from "@/lib/transactions/options";
import { idSchema } from "@/lib/validators/common";

export const metadata: Metadata = { title: "Ubah Transaksi · Keuangan Pribadi" };

const KOLOM = "id, account_id, category_id, type, amount, occurred_on, note, transfer_id";

export default async function UbahTransaksiPage({ params, searchParams }: PageProps<"/transaksi/[id]">) {
  const { id } = await params;
  const { gagal } = await searchParams;
  if (!idSchema.safeParse(id).success) notFound();

  const { supabase } = await requireUser();
  // RLS: transaksi milik pengguna lain tidak akan ditemukan.
  const { data: row } = await supabase.from("transactions").select(KOLOM).eq("id", id).maybeSingle();
  if (!row) notFound();

  // Transfer: ambil kedua sisinya.
  let pasangan: { from: string; to: string } | null = null;
  if (row.transfer_id) {
    const { data: sisi } = await supabase.from("transactions").select("account_id, type").eq("transfer_id", row.transfer_id);
    const from = sisi?.find((s) => s.type === "transfer_out")?.account_id;
    const to = sisi?.find((s) => s.type === "transfer_in")?.account_id;
    if (!from || !to) notFound();
    pasangan = { from, to };
  }

  const dipakai = [row.account_id, row.category_id, pasangan?.from, pasangan?.to].filter((v): v is string => Boolean(v));
  const { accounts, categories } = await loadTransactionFormOptions(supabase, dipakai);

  const target: EditTarget = { id: row.id, transferId: row.transfer_id };
  const isTransfer = pasangan !== null;
  const common = { amount: String(row.amount), occurredOn: row.occurred_on, note: row.note ?? "" };
  const initial = pasangan
    ? { type: "transfer" as const, fromAccountId: pasangan.from, toAccountId: pasangan.to, ...common }
    : {
        type: row.type === "income" ? ("income" as const) : ("expense" as const),
        accountId: row.account_id,
        categoryId: row.category_id ?? undefined,
        ...common,
      };

  return (
    <div className="grid max-w-xl gap-8">
      <div>
        <PageHeader title="Ubah transaksi" />
        <FormAlert tone="error" message={gagal === "hapus" ? "Transaksi gagal dihapus. Silakan coba lagi." : undefined} />
        <TransactionForm
          action={updateTransaction.bind(null, target)}
          accounts={accounts}
          categories={categories}
          initial={initial}
          allowedTypes={isTransfer ? ["transfer"] : ["expense", "income"]}
          submitLabel="Simpan perubahan"
          cancelHref={`/transaksi?bulan=${row.occurred_on.slice(0, 7)}`}
        />
      </div>

      <div className="grid gap-2 rounded-xl border border-border p-4">
        <DeleteTransactionButton action={deleteTransaction.bind(null, target)} isTransfer={isTransfer} />
      </div>
    </div>
  );
}
