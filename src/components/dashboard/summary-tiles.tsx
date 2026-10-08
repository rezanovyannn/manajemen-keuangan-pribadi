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

// Kartu saldo utama memakai band "night" (biru gelap) — satu-satunya bagian gelap di halaman.
// Angka utama periode. Teks memakai warna teks biasa; penanda warna kecil
// menyamakan identitas seri (biru = pemasukan, oranye = pengeluaran).
export function SummaryTiles({ income, expense, net, totalSaldo, netWorth }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="relative overflow-hidden rounded-xl bg-night px-4 py-4 text-night-foreground shadow-soft lg:px-6 lg:py-5">
        <Bintang />
        <p className="relative text-xs text-white/75">Total saldo siap pakai</p>
        <p className="relative mt-1 text-3xl font-bold tracking-tight tabular-nums lg:text-[40px] lg:leading-tight" data-testid="dash-saldo">
          {totalSaldo === null ? "—" : formatRupiah(totalSaldo)}
        </p>
        {netWorth !== undefined && netWorth !== null && (
          <Link
            href="/net-worth"
            className="relative mt-3 flex items-center justify-between gap-2 border-t border-white/15 pt-3 text-sm text-white/75 outline-none hover:text-white focus-visible:text-white focus-visible:underline"
          >
            <span>Net worth</span>
            <span className="flex items-center gap-1 font-semibold text-white tabular-nums" data-testid="dash-net-worth">
              {netWorth < 0 ? `−${formatRupiah(-netWorth)}` : formatRupiah(netWorth)}
              <ChevronRight className="size-4 text-white/60" aria-hidden />
            </span>
          </Link>
        )}
      </div>
      {/* HP: Pemasukan & Pengeluaran berdampingan, Selisih satu baris penuh (angka tidak terpotong). */}
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Tile label="Pemasukan" value={income} swatch="bg-[var(--series-income)]" testId="dash-pemasukan" />
        <Tile label="Pengeluaran" value={expense} swatch="bg-[var(--series-expense)]" testId="dash-pengeluaran" />
        <Tile label="Selisih" value={net} testId="dash-selisih" className="col-span-2 sm:col-span-1" />
      </dl>
    </div>
  );
}

// Hiasan "rasi bintang" kecil (dekorasi saja) dari palet stiker.
function Bintang() {
  const titik = [
    { x: "78%", y: "18%", s: 6, c: "bg-sticker-sky" },
    { x: "88%", y: "42%", s: 4, c: "bg-sticker-pink" },
    { x: "70%", y: "62%", s: 3, c: "bg-white/70" },
    { x: "93%", y: "14%", s: 3, c: "bg-white/60" },
    { x: "83%", y: "70%", s: 5, c: "bg-sticker-purple" },
    { x: "62%", y: "28%", s: 2, c: "bg-white/50" },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {titik.map((t, i) => (
        <span key={i} className={cn("absolute rounded-full", t.c)} style={{ left: t.x, top: t.y, width: t.s, height: t.s }} />
      ))}
    </div>
  );
}

function Tile({
  label,
  value,
  swatch,
  testId,
  className,
}: {
  label: string;
  value: number;
  swatch?: string;
  testId: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-xl border border-border bg-card px-3 py-3 lg:px-4", className)}>
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {swatch && <span aria-hidden className={cn("size-2 shrink-0 rounded-full", swatch)} />}
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-snug font-semibold break-words tabular-nums" data-testid={testId}>
        {formatRupiah(value)}
      </dd>
    </div>
  );
}
