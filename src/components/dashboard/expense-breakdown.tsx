import { formatRupiah, percentOf, type BreakdownItem } from "@/lib/money";

type Item = BreakdownItem & { label: string };

// Pengeluaran per kategori: batang horizontal berurutan (satu seri -> satu warna, tanpa legenda).
// Nilai & persen ditulis langsung sehingga daftar ini juga berfungsi sebagai tabel.
export function ExpenseBreakdown({ items, total }: { items: Item[]; total: number }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Belum ada pengeluaran di periode ini.</p>;
  }
  // "Kategori lain" ada di akhir tapi bisa lebih besar dari baris pertama.
  const max = Math.max(...items.map((i) => i.amount));

  return (
    <ul className="grid grid-cols-1 gap-3" aria-label={`Pengeluaran per kategori, total ${formatRupiah(total)}`}>
      {items.map((item) => {
        // Lebar batang relatif ke kategori terbesar; minimal 2% agar tetap terlihat.
        const lebar = Math.max(2, percentOf(item.amount, max));
        return (
          <li key={item.categoryId ?? "lain"} className="grid grid-cols-1 gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{item.label}</span>
              <span className="shrink-0 tabular-nums">
                {formatRupiah(item.amount)} <span className="text-muted-foreground">· {item.percent}%</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted" aria-hidden>
              <div className="h-full rounded-full bg-[var(--series-expense)]" style={{ width: `${lebar}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
