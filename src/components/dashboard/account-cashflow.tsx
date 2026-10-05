import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import type { AccountCashflowItem } from "@/lib/dashboard/query";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";

// Jumlah akun yang langsung terlihat; sisanya dilipat agar tidak memakan tempat.
const TAMPIL_AWAL = 3;

function bertanda(n: number) {
  return n > 0 ? `+${formatRupiah(n)}` : n < 0 ? `−${formatRupiah(-n)}` : formatRupiah(0);
}

// Arus kas per akun pada periode terpilih. Gaya mengikuti kotak ringkasan di atasnya:
// angka besar = perubahan saldo, tiga kotak kecil = masuk / keluar / transfer.
export function AccountCashflowList({ items }: { items: AccountCashflowItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
        Belum ada transaksi di periode ini.
      </p>
    );
  }
  const awal = items.slice(0, TAMPIL_AWAL);
  const sisa = items.slice(TAMPIL_AWAL);

  return (
    <div className="grid grid-cols-1 gap-3">
      <Daftar items={awal} />
      {sisa.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none rounded-xl border border-border py-2.5 text-center text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Tampilkan {sisa.length} akun lainnya</span>
            <span className="hidden group-open:inline">Sembunyikan</span>
          </summary>
          <div className="mt-3">
            <Daftar items={sisa} />
          </div>
        </details>
      )}
    </div>
  );
}

function Daftar({ items }: { items: AccountCashflowItem[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3">
      {items.map((a) => (
        <li key={a.id}>
          <KartuAkun a={a} />
        </li>
      ))}
    </ul>
  );
}

function KartuAkun({ a }: { a: AccountCashflowItem }) {
  const Ikon = a.net > 0 ? TrendingUp : a.net < 0 ? TrendingDown : Minus;
  return (
    <article className="grid grid-cols-1 gap-3 rounded-xl border border-border px-4 py-3" aria-label={a.name}>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium">{a.name}</p>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {a.typeLabel}
          {a.archived ? " · diarsipkan" : ""}
        </span>
      </div>

      <div>
        <p className="text-xs text-muted-foreground">Perubahan saldo</p>
        <p className="mt-0.5 flex items-center gap-2 text-2xl font-semibold tracking-tight tabular-nums">
          <Ikon
            className={cn(
              "size-5 shrink-0",
              a.net > 0 && "text-emerald-600 dark:text-emerald-400",
              a.net < 0 && "text-rose-600 dark:text-rose-400",
              a.net === 0 && "text-muted-foreground",
            )}
            aria-hidden
          />
          <span aria-label={`Perubahan saldo ${bertanda(a.net)}`}>{bertanda(a.net)}</span>
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        <Mini label="Masuk" value={formatRupiah(a.income)} swatch="bg-[var(--series-income)]" />
        <Mini label="Keluar" value={formatRupiah(a.expense)} swatch="bg-[var(--series-expense)]" />
        <Mini label="Transfer" value={bertanda(a.transferNet)} swatch="bg-muted-foreground" />
      </dl>
    </article>
  );
}

function Mini({ label, value, swatch }: { label: string; value: string; swatch: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/50 px-2.5 py-2">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span aria-hidden className={cn("size-2 shrink-0 rounded-full", swatch)} />
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums" aria-label={`${label} ${value}`}>
        {value}
      </dd>
    </div>
  );
}
