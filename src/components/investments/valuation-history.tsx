import { Trash2 } from "lucide-react";

import { deleteValuation } from "@/actions/investments";
import { Button } from "@/components/ui/button";
import { formatTanggal } from "@/lib/dates";
import { formatGainPercent, formatRupiah, type ValuationPoint } from "@/lib/money";
import { formatUnits } from "@/lib/validators/investment";

type Baris = { id: string; valued_on: string; market_value: number; units: number | string | null; note: string | null };

export function ValuationHistory({ accountId, rows, changes }: { accountId: string; rows: Baris[]; changes: ValuationPoint[] }) {
  // `changes` sejajar dengan `rows` (terbaru dulu) bila jumlahnya sama.
  const sejajar = changes.length === rows.length;
  return (
    <section aria-labelledby="judul-riwayat-nilai" className="grid gap-2 rounded-xl border border-border bg-card p-4">
      <h2 id="judul-riwayat-nilai" className="font-semibold">
        Riwayat nilai
      </h2>
      {rows.length === 0 ? (
        <p className="rounded-lg bg-muted/60 px-3 py-3 text-sm text-muted-foreground">Belum ada. Nilai sekarang = modal sampai kamu memperbaruinya.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium tabular-nums">
                  {formatRupiah(r.market_value)}
                  {sejajar && changes[i]!.change !== 0 && (
                    <span className={changes[i]!.change > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}>
                      {" "}
                      {changes[i]!.change > 0 ? "▲" : "▼"} {formatRupiah(Math.abs(changes[i]!.change))}
                      {changes[i]!.changeTenths !== null && ` (${formatGainPercent(changes[i]!.changeTenths!)})`}
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatTanggal(r.valued_on)}
                  {r.units !== null ? ` · ${formatUnits(String(r.units))} unit` : ""}
                  {r.note ? ` · ${r.note}` : ""}
                </p>
              </div>
              <form action={deleteValuation.bind(null, accountId, r.id)}>
                <Button type="submit" variant="ghost" size="icon" className="size-11 md:size-8" aria-label={`Hapus nilai ${formatTanggal(r.valued_on)}`}>
                  <Trash2 aria-hidden />
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
