import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { formatTanggal } from "@/lib/dates";
import { formatRupiah } from "@/lib/money";
import { groupByDate, type TransactionListItem } from "@/lib/transactions/list";
import { cn } from "@/lib/utils";

// Kolom bergaya tabel di desktop (lg): Kategori · Akun · Catatan · Nominal.
// Tetap berupa daftar (ul/li + link) agar navigasi keyboard & pembaca layar sama dengan di HP.
const KOLOM = "lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1.6fr)_10rem] lg:items-center lg:gap-4";

export function TransactionList({ items }: { items: TransactionListItem[] }) {
  return (
    <div className="grid gap-4">
      <div aria-hidden className={cn("hidden px-4 text-xs font-medium text-muted-foreground", KOLOM)}>
        <span>Kategori</span>
        <span>Akun</span>
        <span>Catatan</span>
        <span className="text-right">Nominal</span>
      </div>
      {groupByDate(items).map((g) => (
        <section key={g.date} aria-labelledby={`tgl-${g.date}`}>
          <h2 id={`tgl-${g.date}`} className="mb-1 px-1 text-xs font-medium text-muted-foreground">
            {formatTanggal(g.date, { weekday: true })}
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {g.items.map((item) => (
              <li key={item.id}>
                <Baris item={item} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Baris({ item }: { item: TransactionListItem }) {
  const judul =
    item.kind === "transfer" ? (
      <span className="inline-flex min-w-0 items-center gap-1">
        <span className="truncate">{item.fromName}</span>
        <ArrowRight className="size-3.5 shrink-0" aria-label="ke" />
        <span className="truncate">{item.toName}</span>
      </span>
    ) : (
      item.categoryLabel
    );
  const sub = item.kind === "transfer" ? "Transfer" : item.accountName;
  const catatan = [item.note, item.fee ? `admin ${formatRupiah(item.fee)}` : null].filter(Boolean).join(" · ");
  const tanda = item.kind === "income" ? "+" : item.kind === "expense" ? "−" : "";

  return (
    <Link
      href={`/transaksi/${item.id}`}
      className={cn(
        "flex items-center gap-3 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted lg:py-2.5",
        KOLOM,
      )}
    >
      <div className="min-w-0 flex-1 lg:contents">
        <p className="truncate font-medium lg:text-[15px]">{judul}</p>
        {/* HP: akun + catatan dalam satu baris kecil */}
        <p className="truncate text-xs text-muted-foreground lg:hidden">
          {sub}
          {catatan ? ` · ${catatan}` : ""}
        </p>
        {/* Desktop: akun dan catatan di kolom masing-masing */}
        <p className="hidden truncate text-sm text-muted-foreground lg:block">{sub}</p>
        <p className="hidden truncate text-sm text-muted-foreground lg:block">{catatan || "—"}</p>
      </div>
      <p
        className={cn(
          "shrink-0 font-medium tabular-nums lg:text-right lg:text-[15px]",
          item.kind === "income" && "text-emerald-700 dark:text-emerald-400",
          item.kind === "expense" && "text-rose-700 dark:text-rose-400",
          item.kind === "transfer" && "text-muted-foreground",
        )}
      >
        {tanda}
        {formatRupiah(item.amount)}
      </p>
    </Link>
  );
}
