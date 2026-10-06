import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";

type Props = {
  income: number;
  expense: number;
  net: number;
  totalSaldo: number | null;
  // Net worth (aset - kewajiban); null jika gagal dihitung.
  netWorth?: number | null;
};

// Angka utama periode. Teks memakai warna teks biasa; penanda warna kecil
// menyamakan identitas seri (biru = pemasukan, oranye = pengeluaran).
export function SummaryTiles({ income, expense, net, totalSaldo, netWorth }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="rounded-xl border border-border px-4 py-3">
        <p className="text-xs text-muted-foreground">Total saldo semua akun aktif</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums" data-testid="dash-saldo">
          {totalSaldo === null ? "—" : formatRupiah(totalSaldo)}
        </p>
        {netWorth !== undefined && netWorth !== null && (
          <Link
            href="/net-worth"
            className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground"
          >
            <span>Net worth</span>
            <span className="flex items-center gap-1 font-medium text-foreground tabular-nums" data-testid="dash-net-worth">
              {netWorth < 0 ? `−${formatRupiah(-netWorth)}` : formatRupiah(netWorth)}
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </span>
          </Link>
        )}
      </div>
      <dl className="grid grid-cols-3 gap-2">
        <Tile label="Pemasukan" value={income} swatch="bg-[var(--series-income)]" testId="dash-pemasukan" />
        <Tile label="Pengeluaran" value={expense} swatch="bg-[var(--series-expense)]" testId="dash-pengeluaran" />
        <Tile label="Selisih" value={net} testId="dash-selisih" />
      </dl>
    </div>
  );
}

function Tile({ label, value, swatch, testId }: { label: string; value: number; swatch?: string; testId: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border px-3 py-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {swatch && <span aria-hidden className={cn("size-2 shrink-0 rounded-full", swatch)} />}
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-semibold tabular-nums" data-testid={testId}>
        {formatRupiah(value)}
      </dd>
    </div>
  );
}
