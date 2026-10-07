import { ChevronRight, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { formatRupiah, type SafeToSpend } from "@/lib/money";

// Kartu "aman dibelanjakan". `detail` menampilkan rincian perhitungan (halaman Insight);
// tanpa `detail` kartu ringkas yang menautkan ke halaman Insight (Beranda).
export function SafeToSpendCard({ safe, detail = false }: { safe: SafeToSpend; detail?: boolean }) {
  const kurang = safe.safe < 0;
  const isi = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {kurang ? (
            <TriangleAlert className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
          ) : (
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
          )}
          Aman dibelanjakan sampai akhir bulan
        </p>
        {!detail && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
      </div>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums" data-testid="aman-dibelanjakan">
        {kurang ? formatRupiah(0) : formatRupiah(safe.safe)}
      </p>
      <p className="text-sm text-muted-foreground" data-testid="aman-per-hari">
        {kurang
          ? `Kurang ${formatRupiah(-safe.safe)} untuk tagihan & budget bulan ini.`
          : `± ${formatRupiah(safe.perDay)}/hari selama ${safe.days} hari lagi`}
      </p>
    </>
  );

  if (!detail) {
    return (
      <Link
        href="/insight"
        className="block rounded-xl border border-border bg-card px-4 py-3 outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {isi}
      </Link>
    );
  }

  return (
    <section aria-label="Aman dibelanjakan" className="rounded-xl border border-border bg-card px-4 py-3">
      {isi}
      <dl className="mt-3 grid grid-cols-1 gap-1 border-t border-border pt-3 text-sm tabular-nums">
        <Baris label="Saldo semua akun aktif" value={formatRupiah(safe.balance)} />
        <Baris label="Tagihan terjadwal" value={`−${formatRupiah(safe.bills)}`} />
        <Baris label="Sisa budget yang belum terpakai" value={`−${formatRupiah(safe.budgetReserve)}`} />
        <Baris label="Aman dibelanjakan" value={formatRupiah(safe.safe)} strong />
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">
        Pemasukan terjadwal (misalnya gaji) tidak ikut dihitung agar angkanya tetap aman jika pemasukan terlambat.
      </p>
    </section>
  );
}

function Baris({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between gap-3 border-t border-border pt-1 font-medium" : "flex justify-between gap-3"}>
      <dt className={strong ? "" : "text-muted-foreground"}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
