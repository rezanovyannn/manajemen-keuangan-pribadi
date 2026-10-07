import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FormAlert } from "@/components/auth/form-field";
import { DebtCard } from "@/components/debts/debt-card";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { JENIS_HUTANG, loadDebts } from "@/lib/debts/query";
import { formatRupiah, totalBalance } from "@/lib/money";
import type { DebtKind } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Utang & Piutang · Keuangan Pribadi" };

const PESAN: Record<string, string> = {
  tersimpan: "Tersimpan.",
  dihapus: "Dihapus.",
};

export default async function UtangPage({ searchParams }: PageProps<"/utang">) {
  const { jenis, status } = await searchParams;
  const kind: DebtKind = jenis === "piutang" ? "piutang" : "utang";
  const { supabase } = await requireUser();
  const { items, error } = await loadDebts(supabase);

  const milikJenis = items.filter((d) => d.kind === kind);
  const aktif = milikJenis.filter((d) => !d.archived && !d.status.settled);
  const selesai = milikJenis.filter((d) => d.archived || d.status.settled);
  const totalSisa = totalBalance(aktif.map((d) => d.status.remaining));

  return (
    <div className="grid w-full grid-cols-1 gap-4 lg:gap-5">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Utang & piutang" description="Sisa dihitung dari pembayaran yang ditandai." />
        <Link href={`/utang/baru?jenis=${kind}`} className={cn(buttonVariants({ size: "lg" }), "h-11 md:h-10 shrink-0")}>
          <Plus aria-hidden />
          Tambah
        </Link>
      </div>

      <nav aria-label="Jenis" className="grid grid-cols-2 rounded-lg border border-border bg-card p-0.5 lg:max-w-sm">
        {(["utang", "piutang"] as const).map((k) => (
          <Link
            key={k}
            href={`/utang?jenis=${k}`}
            aria-current={k === kind ? "page" : undefined}
            className={cn("flex h-9 items-center justify-center rounded-md text-sm font-medium text-muted-foreground", k === kind && "bg-muted text-foreground")}
          >
            {JENIS_HUTANG[k].label}
          </Link>
        ))}
      </nav>

      <FormAlert tone="success" message={typeof status === "string" ? PESAN[status] : undefined} />
      <FormAlert tone="error" message={error ? "Data gagal dimuat." : undefined} />

      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground">{kind === "utang" ? "Total sisa utang" : "Total piutang belum kembali"}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums" data-testid="total-sisa">
          {formatRupiah(totalSisa)}
        </p>
      </div>

      {aktif.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          {kind === "utang" ? "Tidak ada utang aktif." : "Tidak ada piutang aktif."}
        </div>
      ) : (
        <ul className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
          {aktif.map((d) => (
            <li key={d.id}>
              <DebtCard debt={d} />
            </li>
          ))}
        </ul>
      )}

      {selesai.length > 0 && (
        <details className="rounded-xl border border-border bg-card">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-muted-foreground">Lunas / diarsipkan ({selesai.length})</summary>
          <ul className="grid grid-cols-1 items-start gap-3 border-t border-border p-3 lg:grid-cols-2">
            {selesai.map((d) => (
              <li key={d.id}>
                <DebtCard debt={d} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
