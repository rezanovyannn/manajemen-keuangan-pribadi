import { ChevronRight, Plus, Target, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { setAccountArchived } from "@/actions/accounts";
import { FormAlert } from "@/components/auth/form-field";
import { AccountIcon } from "@/components/accounts/account-icon";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { accountTypeLabel, isSpendable } from "@/lib/accounts/types";
import { requireUser } from "@/lib/auth/session";
import { InvestmentCard } from "@/components/investments/investment-card";
import { loadAccountSavings, type AccountSavings } from "@/lib/goals/query";
import { investmentTotals, loadInvestments } from "@/lib/investments/query";
import { formatRupiah, totalBalance } from "@/lib/money";
import { loadAccountBalances } from "@/lib/transactions/balances";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Akun · Keuangan Pribadi" };

const PESAN_GAGAL: Record<string, string> = {
  nama: "Akun tidak bisa dipulihkan karena namanya sudah dipakai akun aktif lain.",
  arsip: "Perubahan gagal disimpan. Silakan coba lagi.",
};

export default async function AkunPage({ searchParams }: PageProps<"/akun">) {
  const { gagal } = await searchParams;
  const { supabase } = await requireUser();

  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("id, name, type, opening_balance, archived_at")
    .order("created_at");
  if (error) console.error("[accounts] daftar gagal", { code: error.code });

  // Akun siap pakai di atas; akun investasi punya bagian sendiri (nilai pasar, untung/rugi).
  const aktif = accounts?.filter((a) => !a.archived_at && isSpendable(a.type)) ?? [];
  const arsip = accounts?.filter((a) => a.archived_at) ?? [];

  // Saldo terkini = saldo awal + seluruh transaksi (lihat src/lib/money/balance.ts).
  const { balances, error: saldoError } = await loadAccountBalances(supabase, accounts ?? []);
  const saldo = (id: string) => balances?.get(id);
  const total = balances ? totalBalance(aktif.map((a) => balances.get(a.id) ?? 0)) : undefined;
  // Tabungan yang disisihkan per akun (goal_allocations) + sisa bebas dipakai.
  const [{ byAccount: tabungan }, investasi] = await Promise.all([
    balances ? loadAccountSavings(supabase, aktif, balances) : Promise.resolve({ byAccount: null }),
    loadInvestments(supabase),
  ]);
  const asetAktif = investasi.items.filter((i) => !i.archived);
  const totalInvestasi = investmentTotals(investasi.items);

  return (
    <div className="grid w-full grid-cols-1 gap-4 lg:gap-5">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Akun" description="Dompet, rekening bank, dan e-wallet." />
        <Link href="/akun/baru" className={cn(buttonVariants({ size: "lg" }), "h-11 md:h-10 shrink-0")}>
          <Plus aria-hidden />
          Tambah
        </Link>
      </div>

      <FormAlert
        tone="error"
        message={
          error
            ? "Daftar akun gagal dimuat."
            : saldoError
              ? "Saldo gagal dihitung. Coba muat ulang halaman."
              : typeof gagal === "string"
                ? PESAN_GAGAL[gagal]
                : undefined
        }
      />

      {aktif.length > 0 && total !== undefined && (
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Total saldo siap pakai</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums" data-testid="total-saldo">
            {formatRupiah(total)}
          </p>
        </div>
      )}

      {aktif.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          Belum ada akun. Tambahkan dompet atau rekening pertamamu.
        </div>
      ) : (
        // HP: daftar ringkas dalam satu kartu. Desktop (lg): grid kartu per akun.
        <ul className="divide-y divide-border rounded-xl border border-border bg-card lg:grid lg:grid-cols-3 lg:gap-3 lg:divide-y-0 lg:border-0 lg:bg-transparent">
          {aktif.map((a) => (
            <li key={a.id} className="lg:rounded-xl lg:border lg:border-border lg:bg-card">
              <Link
                href={`/akun/${a.id}`}
                className="grid grid-cols-1 gap-2.5 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted lg:h-full lg:content-start lg:gap-4 lg:rounded-xl lg:p-5"
              >
                <div className="flex items-center gap-3 lg:flex-col lg:items-stretch lg:gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <AccountIcon type={a.type} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{accountTypeLabel(a.type)}</p>
                  </div>
                  <ChevronRight className="hidden size-4 text-muted-foreground lg:block" aria-hidden />
                </div>
                <div className="text-right lg:text-left">
                  <p
                    className={cn(
                      "font-medium tabular-nums lg:text-2xl lg:font-semibold lg:tracking-tight",
                      (saldo(a.id) ?? 0) < 0 && "text-rose-700 dark:text-rose-400",
                    )}
                  >
                    {saldo(a.id) === undefined ? "—" : formatRupiah(saldo(a.id)!)}
                  </p>
                  <p className="text-xs text-muted-foreground">Awal {formatRupiah(a.opening_balance)}</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground lg:hidden" aria-hidden />
                </div>
                {tabungan?.get(a.id) && <PembagianTabungan s={tabungan.get(a.id)!} />}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="judul-investasi" className="grid grid-cols-1 gap-3">
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <h2 id="judul-investasi" className="font-semibold">
              Investasi
            </h2>
            <p className="text-xs text-muted-foreground">Tidak dihitung sebagai uang siap pakai; masuk Net worth.</p>
          </div>
          {asetAktif.length > 0 && (
            <div className="text-right">
              <p className="text-lg font-semibold tabular-nums" data-testid="total-investasi">
                {formatRupiah(totalInvestasi.value)}
              </p>
              <p
                className={cn(
                  "text-xs font-medium tabular-nums",
                  totalInvestasi.gain > 0 && "text-emerald-700 dark:text-emerald-400",
                  totalInvestasi.gain < 0 && "text-rose-700 dark:text-rose-400",
                )}
              >
                {totalInvestasi.gain >= 0 ? "+" : "−"}
                {formatRupiah(Math.abs(totalInvestasi.gain))}
              </p>
            </div>
          )}
        </div>
        {investasi.error && <FormAlert tone="error" message="Data investasi gagal dimuat." />}
        {asetAktif.length === 0 ? (
          <Link
            href="/akun/baru?jenis=investment"
            className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Punya reksadana, saham, emas, atau crypto? <span className="font-medium text-link">Tambah akun investasi</span>
          </Link>
        ) : (
          <ul className="grid grid-cols-1 items-start gap-3 lg:grid-cols-3">
            {asetAktif.map((i) => (
              <li key={i.id}>
                <InvestmentCard item={i} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {arsip.length > 0 && (
        <details className="rounded-xl border border-border bg-card">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-muted-foreground">
            Diarsipkan ({arsip.length})
          </summary>
          <ul className="divide-y divide-border border-t border-border">
            {arsip.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-muted-foreground">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {accountTypeLabel(a.type)}
                    {saldo(a.id) !== undefined && ` · saldo ${formatRupiah(saldo(a.id)!)}`}
                  </p>
                </div>
                <form action={setAccountArchived.bind(null, a.id, false)}>
                  <Button type="submit" variant="outline" size="sm">
                    Pulihkan
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// Tabungan per tujuan yang disisihkan dari akun ini, lalu sisa bebas dipakai.
function PembagianTabungan({ s }: { s: AccountSavings }) {
  return (
    <dl className="grid grid-cols-1 gap-1 rounded-lg bg-muted/60 px-3 py-2 text-xs">
      {s.goals.map((g) => (
        <div key={g.goalId} className="flex items-start justify-between gap-3">
          <dt className="flex min-w-0 items-start gap-1.5 text-muted-foreground">
            <Target className="mt-px size-3.5 shrink-0 text-link" aria-hidden />
            <span className="break-words">Tabungan {g.name}</span>
          </dt>
          <dd className="shrink-0 font-semibold tabular-nums">{formatRupiah(g.amount)}</dd>
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-1">
        <dt className="text-muted-foreground">Bebas dipakai</dt>
        <dd className={cn("shrink-0 font-semibold tabular-nums", s.free < 0 && "text-rose-700 dark:text-rose-400")}>{formatRupiah(s.free)}</dd>
      </div>
      {s.shortfall > 0 && (
        <p className="flex items-start gap-1.5 text-amber-800 dark:text-amber-300">
          <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          Saldo kurang {formatRupiah(s.shortfall)} dari tabungan yang disisihkan.
        </p>
      )}
    </dl>
  );
}
