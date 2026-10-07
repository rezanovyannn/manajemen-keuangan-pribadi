import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { deleteTransaction, updateTransaction, type EditTarget } from "@/actions/transactions-edit";
import { FormAlert } from "@/components/auth/form-field";
import { PageHeader } from "@/components/page-header";
import { DeleteTransactionButton } from "@/components/transactions/delete-button";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { requireUser } from "@/lib/auth/session";
import { loadTransactionFormOptions } from "@/lib/transactions/options";
import { idSchema } from "@/lib/validators/common";

export const metadata: Metadata = { title: "Ubah Transaksi · Keuangan Pribadi" };

const KOLOM = "id, account_id, category_id, type, amount, occurred_on, note, transfer_id, fee_for_id";

export default async function UbahTransaksiPage({ params, searchParams }: PageProps<"/transaksi/[id]">) {
  const { id } = await params;
  const { gagal } = await searchParams;
  if (!idSchema.safeParse(id).success) notFound();

  const { supabase } = await requireUser();
  // RLS: transaksi milik pengguna lain tidak akan ditemukan.
  const { data: row } = await supabase.from("transactions").select(KOLOM).eq("id", id).maybeSingle();
  if (!row) notFound();
  // Baris biaya admin diubah lewat transaksi utamanya.
  if (row.fee_for_id) redirect(`/transaksi/${row.fee_for_id}`);

  // Transfer: ambil kedua sisinya. Biaya admin transfer menempel di sisi transfer_out.
  let pasangan: { from: string; to: string; outId: string } | null = null;
  if (row.transfer_id) {
    const { data: sisi } = await supabase.from("transactions").select("id, account_id, type").eq("transfer_id", row.transfer_id);
    const out = sisi?.find((s) => s.type === "transfer_out");
    const to = sisi?.find((s) => s.type === "transfer_in")?.account_id;
    if (!out || !to) notFound();
    pasangan = { from: out.account_id, to, outId: out.id };
  }
  const { data: biaya } = await supabase
    .from("transactions")
    .select("amount")
    .eq("fee_for_id", pasangan?.outId ?? row.id)
    .maybeSingle();

  const dipakai = [row.account_id, row.category_id, pasangan?.from, pasangan?.to].filter((v): v is string => Boolean(v));
  const { accounts, categories } = await loadTransactionFormOptions(supabase, dipakai);

  const target: EditTarget = { id: row.id, transferId: row.transfer_id, hasFee: Boolean(biaya) };
  const isTransfer = pasangan !== null;
  const common = { amount: String(row.amount), occurredOn: row.occurred_on, note: row.note ?? "", fee: biaya ? String(biaya.amount) : "" };
  const initial = pasangan
    ? { type: "transfer" as const, fromAccountId: pasangan.from, toAccountId: pasangan.to, ...common }
    : {
        type: row.type === "income" ? ("income" as const) : ("expense" as const),
        accountId: row.account_id,
        categoryId: row.category_id ?? undefined,
        ...common,
      };

  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-1 gap-8">
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

      <div className="grid gap-2 rounded-xl border border-border bg-card p-4">
        <DeleteTransactionButton action={deleteTransaction.bind(null, target)} isTransfer={isTransfer} />
      </div>
    </div>
  );
}
