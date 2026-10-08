import { Trash2 } from "lucide-react";

import { deleteAllocation } from "@/actions/goal-allocations";
import { Button } from "@/components/ui/button";
import { formatTanggal } from "@/lib/dates";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";

type Baris = { id: string; account_id: string; accountName: string; amount: number; occurred_on: string; note: string | null };

// Riwayat sisihkan (+) / ambil (−) satu tujuan, terbaru di atas.
export function AllocationHistory({ goalId, rows }: { goalId: string; rows: Baris[] }) {
  return (
    <section aria-labelledby="judul-riwayat" className="grid gap-2 rounded-xl border border-border bg-card p-4">
      <h2 id="judul-riwayat" className="font-semibold">
        Riwayat tabungan
      </h2>
      {rows.length === 0 ? (
        <p className="rounded-lg bg-muted/60 px-3 py-3 text-sm text-muted-foreground">Belum ada riwayat.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => {
            const ambil = r.amount < 0;
            return (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {ambil ? "Ambil ke" : "Sisihkan dari"} {r.accountName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatTanggal(r.occurred_on)}
                    {r.note ? ` · ${r.note}` : ""}
                  </p>
                </div>
                <span className={cn("shrink-0 text-sm font-semibold tabular-nums", ambil && "text-muted-foreground")}>
                  {ambil ? `−${formatRupiah(-r.amount)}` : `+${formatRupiah(r.amount)}`}
                </span>
                <form action={deleteAllocation.bind(null, goalId, r.id)}>
                  <Button type="submit" variant="ghost" size="icon" className="size-11 md:size-8" aria-label={`Hapus riwayat ${formatTanggal(r.occurred_on)}`}>
                    <Trash2 aria-hidden />
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
