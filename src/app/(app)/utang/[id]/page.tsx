import { Archive, ArchiveRestore, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteDebt, setDebtArchived } from "@/actions/debts";
import { FormAlert } from "@/components/auth/form-field";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { DebtCard } from "@/components/debts/debt-card";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { formatTanggal } from "@/lib/dates";
import { JENIS_HUTANG, loadDebts } from "@/lib/debts/query";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import { idSchema } from "@/lib/validators/common";

export const metadata: Metadata = { title: "Detail Utang/Piutang · Keuangan Pribadi" };

const PESAN: Record<string, { tone: "success" | "error"; text: string }> = {
  dibayar: { tone: "success", text: "Pembayaran tercatat." },
  diubah: { tone: "success", text: "Perubahan tersimpan." },
  diarsipkan: { tone: "success", text: "Diarsipkan." },
  dipulihkan: { tone: "success", text: "Dipulihkan." },
  "ada-pembayaran": { tone: "error", text: "Tidak bisa dihapus karena sudah ada pembayaran. Arsipkan saja." },
  gagal: { tone: "error", text: "Perubahan gagal disimpan. Silakan coba lagi." },
};

export default async function DetailUtangPage({ params, searchParams }: PageProps<"/utang/[id]">) {
  const { id } = await params;
  const { status } = await searchParams;
  if (!idSchema.safeParse(id).success) notFound();

  const { supabase } = await requireUser();
  const [{ items }, paymentsRes, accountsRes] = await Promise.all([
    loadDebts(supabase),
    supabase.from("transactions").select("id, amount, occurred_on, note, account_id").eq("debt_id", id).order("occurred_on", { ascending: false }),
    supabase.from("accounts").select("id, name"),
  ]);
  // RLS: data milik pengguna lain tidak akan ditemukan.
  const debt = items.find((d) => d.id === id);
  if (!debt) notFound();

  const jenis = JENIS_HUTANG[debt.kind];
  const akun = new Map((accountsRes.data ?? []).map((a) => [a.id, a.name]));
  const payments = paymentsRes.data ?? [];
  const pesan = typeof status === "string" ? PESAN[status] : undefined;

  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-1 gap-4">
      <PageHeader title={debt.name} description={`${jenis.label}${debt.archived ? " · diarsipkan" : ""}`} />
      <FormAlert tone={pesan?.tone ?? "success"} message={pesan?.text} />
      <DebtCard debt={debt} />

      {!debt.status.settled && !debt.archived && (
        <Link href={`/transaksi/baru?utang=${debt.id}`} className={cn(buttonVariants({ size: "lg" }), "h-10")}>
          {jenis.aksi} {debt.kind === "utang" ? "cicilan" : "pembayaran"}
        </Link>
      )}

      <section aria-labelledby="judul-bayar" className="grid grid-cols-1 gap-2">
        <h2 id="judul-bayar" className="px-1 font-medium">
          Riwayat {debt.kind === "utang" ? "pembayaran" : "penerimaan"}
        </h2>
        {payments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">Belum ada.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {payments.map((p) => (
              <li key={p.id}>
                <Link href={`/transaksi/${p.id}`} className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{formatTanggal(p.occurred_on)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {akun.get(p.account_id) ?? ""}
                      {p.note ? ` · ${p.note}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 font-medium tabular-nums">{formatRupiah(p.amount)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {debt.status.overpaid > 0 && (
          <p className="px-1 text-xs text-muted-foreground">Kelebihan {formatRupiah(debt.status.overpaid)} dari jumlah awal.</p>
        )}
      </section>

      <div className="grid gap-3 rounded-xl border border-border bg-card p-4">
        <Link href={`/utang/${debt.id}/ubah`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 sm:justify-self-start")}>
          <Pencil aria-hidden />
          Ubah data
        </Link>
        <form action={setDebtArchived.bind(null, debt.id, !debt.archived)}>
          <Button type="submit" variant="outline" size="lg" className="h-10">
            {debt.archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
            {debt.archived ? "Pulihkan" : "Arsipkan"}
          </Button>
        </form>
        {payments.length === 0 && (
          <ConfirmDeleteButton action={deleteDebt.bind(null, debt.id)} label="Hapus" message={`Yakin hapus ${debt.name}?`} />
        )}
      </div>
    </div>
  );
}
