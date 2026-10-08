import { Trash2 } from "lucide-react";

import { deleteValuation } from "@/actions/investments";
import { Button } from "@/components/ui/button";
import { formatTanggal } from "@/lib/dates";
import { formatRupiah } from "@/lib/money";
import { formatUnits } from "@/lib/validators/investment";

type Baris = { id: string; valued_on: string; market_value: number; units: number | string | null; note: string | null };

export function ValuationHistory({ accountId, rows }: { accountId: string; rows: Baris[] }) {
  return (
    <section aria-labelledby="judul-riwayat-nilai" className="grid gap-2 rounded-xl border border-border bg-card p-4">
      <h2 id="judul-riwayat-nilai" className="font-semibold">
        Riwayat nilai
      </h2>
      {rows.length === 0 ? (
        <p className="rounded-lg bg-muted/60 px-3 py-3 text-sm text-muted-foreground">Belum ada. Nilai sekarang = modal sampai kamu memperbaruinya.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium tabular-nums">{formatRupiah(r.market_value)}</p>
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
