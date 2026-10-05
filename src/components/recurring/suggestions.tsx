import { CalendarClock } from "lucide-react";
import Link from "next/link";

import { skipOccurrence } from "@/actions/recurring";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatRupiah } from "@/lib/money";
import { daysUntil, dueLabel } from "@/lib/recurring/schedule";
import { cn } from "@/lib/utils";

type Saran = { id: string; name: string; type: "income" | "expense"; amount: number; next_due_date: string };

// "Perlu dicatat": saran dari jadwal berulang. Tidak ada yang dicatat otomatis.
export function RecurringSuggestions({ items, today }: { items: Saran[]; today: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="judul-saran" className="grid grid-cols-1 gap-3 rounded-xl border border-border p-4">
      <h2 id="judul-saran" className="flex items-center gap-2 font-medium">
        <CalendarClock className="size-4 text-muted-foreground" aria-hidden />
        Perlu dicatat
      </h2>
      <ul className="grid grid-cols-1 gap-3">
        {items.map((s) => {
          const terlambat = daysUntil(s.next_due_date, today) < 0;
          return (
            <li key={`${s.id}-${s.next_due_date}`} className="grid grid-cols-1 gap-2 rounded-lg bg-muted/50 px-3 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate font-medium">{s.name}</p>
                <p className="shrink-0 text-sm tabular-nums">
                  {s.type === "income" ? "+" : "−"}
                  {formatRupiah(s.amount)}
                </p>
              </div>
              <p className={cn("text-xs", terlambat ? "font-medium text-rose-700 dark:text-rose-400" : "text-muted-foreground")}>
                {dueLabel(s.next_due_date, today)}
              </p>
              <div className="flex gap-2">
                <Link
                  href={`/transaksi/baru?jadwal=${s.id}&tanggal=${s.next_due_date}`}
                  className={cn(buttonVariants({ size: "lg" }), "h-9 flex-1")}
                  aria-label={`Catat ${s.name}`}
                >
                  Catat
                </Link>
                <form action={skipOccurrence.bind(null, s.id, s.next_due_date)} className="flex-1">
                  <Button type="submit" variant="outline" size="lg" className="h-9 w-full" aria-label={`Lewati ${s.name}`}>
                    Lewati
                  </Button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
