import type { Metadata } from "next";
import Link from "next/link";

import { createTransaction } from "@/actions/transactions";
import { SaveOfflineOptions } from "@/components/offline/save-offline-options";
import { PageHeader } from "@/components/page-header";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { JENIS_HUTANG, loadDebts } from "@/lib/debts/query";
import { formatTanggal, isValidDateString, todayInJakarta } from "@/lib/dates";
import { formatRupiah } from "@/lib/money";
import { loadTransactionFormOptions } from "@/lib/transactions/options";
import { cn } from "@/lib/utils";
import { idSchema } from "@/lib/validators/common";
import type { TransactionFormType } from "@/lib/validators/transaction";

export const metadata: Metadata = { title: "Tambah Transaksi · Keuangan Pribadi" };

function asType(v: unknown): TransactionFormType {
  return v === "income" || v === "transfer" ? v : "expense";
}

export default async function TransaksiBaruPage({ searchParams }: PageProps<"/transaksi/baru">) {
  const { tipe, akun, tersimpan, jadwal, tanggal, utang } = await searchParams;
  const { supabase } = await requireUser();

  // Dibuka dari saran "Catat" di Beranda: isi form dari jadwal berulang.
  const dariJadwal =
    typeof jadwal === "string" && idSchema.safeParse(jadwal).success && typeof tanggal === "string" && isValidDateString(tanggal)
      ? (
          await supabase
            .from("recurring_rules")
            .select("id, name, type, account_id, category_id, amount, note")
            .eq("id", jadwal)
            .maybeSingle()
        ).data
      : null;

  const { accounts, categories } = await loadTransactionFormOptions(
    supabase,
    dariJadwal ? [dariJadwal.account_id, dariJadwal.category_id] : [],
  );

  if (accounts.length === 0) {
    return (
      <div className="grid max-w-xl grid-cols-1 gap-4">
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

  // Dibuka dari tombol "Bayar"/"Terima" di halaman utang & piutang.
  if (typeof utang === "string" && idSchema.safeParse(utang).success) {
    const debt = (await loadDebts(supabase)).items.find((d) => d.id === utang && !d.archived && !d.status.settled);
    if (debt) {
      const jenis = JENIS_HUTANG[debt.kind];
      const kategori = categories.find((c) => c.type === jenis.tipe && c.label === jenis.kategori)?.value;
      const nominal = debt.installmentAmount ? Math.min(debt.installmentAmount, debt.status.remaining) : debt.status.remaining;
      return (
        <div className="grid max-w-xl grid-cols-1">
          <PageHeader title={`${jenis.aksi} ${debt.name}`} description={`Sisa ${formatRupiah(debt.status.remaining)}`} />
          <TransactionForm
            action={createTransaction}
            accounts={accounts}
            categories={categories}
            initial={{ type: jenis.tipe, accountId: accounts[0]?.value, categoryId: kategori, amount: String(nominal), occurredOn: todayInJakarta(), note: `${jenis.aksi} ${debt.name}` }}
            allowedTypes={[jenis.tipe]}
            hiddenFields={{ debtId: debt.id }}
            submitLabel="Simpan"
            cancelHref={`/utang/${debt.id}`}
            notice={debt.kind === "utang" ? "Dicatat sebagai pengeluaran dan mengurangi sisa utang." : "Dicatat sebagai pemasukan dan mengurangi sisa piutang."}
          />
        </div>
      );
    }
  }

  if (dariJadwal && typeof tanggal === "string") {
    // Jatuh tempo di masa depan tapi dicatat sekarang -> pakai tanggal hari ini.
    const hariIni = todayInJakarta();
    return (
      <div className="grid max-w-xl grid-cols-1">
        <PageHeader title="Catat dari jadwal" description={`${dariJadwal.name} · jadwal ${formatTanggal(tanggal)}`} />
        <TransactionForm
          action={createTransaction}
          accounts={accounts}
          categories={categories}
          initial={{
            type: dariJadwal.type,
            accountId: dariJadwal.account_id,
            categoryId: dariJadwal.category_id,
            amount: String(dariJadwal.amount),
            occurredOn: tanggal < hariIni ? tanggal : hariIni,
            note: dariJadwal.note ?? dariJadwal.name,
          }}
          allowedTypes={["expense", "income"]}
          hiddenFields={{ recurringRuleId: dariJadwal.id, recurringDate: tanggal }}
          submitLabel="Simpan"
          cancelHref="/beranda"
          notice="Periksa nominal dan tanggal, ubah jika berbeda, lalu simpan."
        />
      </div>
    );
  }

  const accountId = typeof akun === "string" ? akun : accounts[0]?.value;

  return (
    <div className="grid max-w-xl grid-cols-1">
      {/* Simpan daftar akun & kategori di HP untuk form offline. */}
      <SaveOfflineOptions accounts={accounts} categories={categories} />
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
