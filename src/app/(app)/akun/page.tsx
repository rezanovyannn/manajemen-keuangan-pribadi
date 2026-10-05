import { ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { setAccountArchived } from "@/actions/accounts";
import { FormAlert } from "@/components/auth/form-field";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { accountTypeLabel } from "@/lib/accounts/types";
import { requireUser } from "@/lib/auth/session";
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

  const aktif = accounts?.filter((a) => !a.archived_at) ?? [];
  const arsip = accounts?.filter((a) => a.archived_at) ?? [];

  // Saldo terkini = saldo awal + seluruh transaksi (lihat src/lib/money/balance.ts).
  const { balances, error: saldoError } = await loadAccountBalances(supabase, accounts ?? []);
  const saldo = (id: string) => balances?.get(id);
  const total = balances ? totalBalance(aktif.map((a) => balances.get(a.id) ?? 0)) : undefined;

  return (
    <div className="grid max-w-xl gap-4">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Akun" description="Dompet, rekening bank, dan e-wallet." />
        <Link href="/akun/baru" className={cn(buttonVariants({ size: "lg" }), "h-10 shrink-0")}>
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
        <div className="rounded-xl border border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">Total saldo akun aktif</p>
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
        <ul className="divide-y divide-border rounded-xl border border-border">
          {aktif.map((a) => (
            <li key={a.id}>
              <Link
                href={`/akun/${a.id}`}
                className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{accountTypeLabel(a.type)}</p>
                </div>
                <div className="text-right">
                  <p className={cn("font-medium tabular-nums", (saldo(a.id) ?? 0) < 0 && "text-rose-700 dark:text-rose-400")}>
                    {saldo(a.id) === undefined ? "—" : formatRupiah(saldo(a.id)!)}
                  </p>
                  <p className="text-xs text-muted-foreground">Awal {formatRupiah(a.opening_balance)}</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {arsip.length > 0 && (
        <details className="rounded-xl border border-border">
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
