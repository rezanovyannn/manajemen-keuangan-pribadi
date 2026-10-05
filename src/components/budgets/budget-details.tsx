import type { BudgetDetail } from "@/lib/budgets/query";
import { formatTanggalPendek } from "@/lib/dates";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";

const PENANDA = {
  hampir: { text: "Mulai hampir habis", className: "bg-amber-500/15 text-amber-800 dark:text-amber-300" },
  terlampaui: { text: "Mulai terlampaui", className: "bg-rose-500/10 text-rose-700 dark:text-rose-400" },
} as const;

// Rincian transaksi budget: tanggal, kategori/catatan, nominal, dan total berjalan.
// Transaksi yang membuat budget melewati 80% / 100% ditandai.
export function BudgetDetails({ details }: { details: BudgetDetail[] }) {
  if (details.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada pengeluaran di kategori ini bulan ini.</p>;
  }

  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Rincian transaksi dan total berjalan</caption>
      <thead className="text-xs text-muted-foreground">
        <tr>
          <th scope="col" className="pb-1 text-left font-medium">Transaksi</th>
          <th scope="col" className="pb-1 text-right font-medium">Nominal</th>
          <th scope="col" className="pb-1 text-right font-medium">Total</th>
        </tr>
      </thead>
      <tbody>
        {details.map((d) => (
          <tr key={d.id} className={cn("border-t border-border align-top", d.marker && "bg-muted/40")}>
            <td className="py-2 pr-2">
              <p className="text-xs text-muted-foreground">{formatTanggalPendek(d.occurredOn)}</p>
              <p className="break-words">{d.note ?? d.label}</p>
              {d.note && <p className="text-xs text-muted-foreground">{d.label}</p>}
              {d.marker && (
                <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium", PENANDA[d.marker].className)}>
                  {PENANDA[d.marker].text}
                </span>
              )}
            </td>
            <td className="py-2 text-right whitespace-nowrap tabular-nums">{formatRupiah(d.amount)}</td>
            <td className="py-2 pl-2 text-right whitespace-nowrap text-muted-foreground tabular-nums">{formatRupiah(d.cumulative)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
