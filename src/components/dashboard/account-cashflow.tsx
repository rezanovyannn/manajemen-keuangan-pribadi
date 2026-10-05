import { formatRupiah } from "@/lib/money";
import type { AccountCashflowItem } from "@/lib/dashboard/query";
import { cn } from "@/lib/utils";

// Jumlah akun yang langsung terlihat; sisanya dilipat agar tidak memakan tempat.
const TAMPIL_AWAL = 5;

function bertanda(n: number) {
  return n > 0 ? `+${formatRupiah(n)}` : n < 0 ? `−${formatRupiah(-n)}` : formatRupiah(0);
}

// Arus kas per akun pada periode terpilih: perubahan saldo di kanan,
// rincian pemasukan / pengeluaran / transfer di bawah nama akun.
export function AccountCashflowList({ items }: { items: AccountCashflowItem[] }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Belum ada transaksi di periode ini.</p>;
  }
  const awal = items.slice(0, TAMPIL_AWAL);
  const sisa = items.slice(TAMPIL_AWAL);

  return (
    <div className="grid grid-cols-1 gap-2">
      <Daftar items={awal} />
      {sisa.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none py-1 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Tampilkan {sisa.length} akun lainnya</span>
            <span className="hidden group-open:inline">Sembunyikan</span>
          </summary>
          <Daftar items={sisa} />
        </details>
      )}
    </div>
  );
}

function Daftar({ items }: { items: AccountCashflowItem[] }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((a) => (
          <li key={a.id} className="grid grid-cols-1 gap-1 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate font-medium">
                {a.name}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  · {a.typeLabel}
                  {a.archived ? " · diarsipkan" : ""}
                </span>
              </p>
              <p
                className={cn(
                  "shrink-0 font-medium tabular-nums",
                  a.net < 0 && "text-rose-700 dark:text-rose-400",
                  a.net > 0 && "text-emerald-700 dark:text-emerald-400",
                )}
                aria-label={`Perubahan saldo ${bertanda(a.net)}`}
              >
                {bertanda(a.net)}
              </p>
            </div>
            <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
              <span>Masuk {formatRupiah(a.income)}</span>
              <span>Keluar {formatRupiah(a.expense)}</span>
              {(a.transferIn > 0 || a.transferOut > 0) && <span>Transfer {bertanda(a.transferNet)}</span>}
            </p>
          </li>
      ))}
    </ul>
  );
}
