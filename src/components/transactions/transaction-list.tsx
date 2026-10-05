import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { formatTanggal } from "@/lib/dates";
import { formatRupiah } from "@/lib/money";
import { groupByDate, type TransactionListItem } from "@/lib/transactions/list";
import { cn } from "@/lib/utils";

export function TransactionList({ items }: { items: TransactionListItem[] }) {
  return (
    <div className="grid gap-4">
      {groupByDate(items).map((g) => (
        <section key={g.date} aria-labelledby={`tgl-${g.date}`}>
          <h2 id={`tgl-${g.date}`} className="mb-1 px-1 text-xs font-medium text-muted-foreground">
            {formatTanggal(g.date, { weekday: true })}
          </h2>
          <ul className="divide-y divide-border rounded-xl border border-border">
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
  const tanda = item.kind === "income" ? "+" : item.kind === "expense" ? "−" : "";

  return (
    <Link
      href={`/transaksi/${item.id}`}
      className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{judul}</p>
        <p className="truncate text-xs text-muted-foreground">
          {sub}
          {item.note ? ` · ${item.note}` : ""}
        </p>
      </div>
      <p
        className={cn(
          "shrink-0 font-medium tabular-nums",
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
