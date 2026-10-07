import { formatBulan } from "@/lib/dates";
import { formatRupiah, formatTenths, TARGET_DANA_DARURAT_BULAN, type IncomeStability } from "@/lib/money";
import { cn } from "@/lib/utils";

// Pendapatan tidak tetap: rata-rata 6 bulan penuh + dana darurat dibanding target 3-6 bulan.
export function StabilityCard({ s, months }: { s: IncomeStability | null; months: string[] }) {
  if (!s || (s.avgIncome === 0 && s.avgExpense === 0)) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        Belum cukup riwayat. Butuh transaksi beberapa bulan penuh terakhir.
      </p>
    );
  }

  const { min, max } = TARGET_DANA_DARURAT_BULAN;
  const runway = s.runwayTenths;
  const status =
    runway === null ? null : runway < min * 10 ? "kurang" : runway < max * 10 ? "cukup" : "ideal";
  const GAYA = {
    kurang: { teks: `Di bawah target ${min} bulan`, kelas: "bg-rose-500/10 text-rose-700 dark:text-rose-400", bar: "bg-rose-600" },
    cukup: { teks: `Sudah ${min}+ bulan, target ideal ${max} bulan`, kelas: "bg-amber-500/15 text-amber-800 dark:text-amber-300", bar: "bg-amber-500" },
    ideal: { teks: `Ideal (${max}+ bulan)`, kelas: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-600" },
  } as const;
  // Progress menuju 6 bulan (dalam persepuluhan bulan, tanpa float).
  const lebar = runway === null ? 0 : Math.min(100, Math.floor((runway * 100) / (max * 10)));

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground">Dana darurat (total saldo ÷ rata-rata pengeluaran)</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums" data-testid="runway">
          {runway === null ? "—" : `Cukup ±${formatTenths(runway)} bulan`}
        </p>
        {status && (
          <>
            <div
              role="progressbar"
              aria-label="Dana darurat menuju 6 bulan"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={lebar}
              className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
            >
              <div className={cn("h-full rounded-full", GAYA[status].bar)} style={{ width: `${lebar}%` }} />
            </div>
            <span className={cn("mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium", GAYA[status].kelas)}>{GAYA[status].teks}</span>
          </>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-2">
        <Tile label="Rata-rata pemasukan" value={formatRupiah(s.avgIncome)} />
        <Tile label="Rata-rata pengeluaran" value={formatRupiah(s.avgExpense)} />
        <Tile label="Pemasukan terendah" value={formatRupiah(s.minIncome)} />
        <Tile label="Pemasukan tertinggi" value={formatRupiah(s.maxIncome)} />
      </dl>
      <p className="px-1 text-xs text-muted-foreground">
        Dihitung dari {s.months} bulan penuh ({formatBulan(months[0]!)} – {formatBulan(months.at(-1)!)}). Untuk pendapatan tidak
        tetap, gunakan angka terendah sebagai patokan anggaran bulanan.
      </p>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card px-3 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold tabular-nums" aria-label={`${label} ${value}`}>
        {value}
      </dd>
    </div>
  );
}
