import Link from "next/link";

import type { BudgetItem } from "@/lib/budgets/query";
import { formatRupiah, type BudgetStatus } from "@/lib/money";
import { cn } from "@/lib/utils";

const GAYA: Record<BudgetStatus, { label: string; bar: string; badge: string }> = {
  aman: {
    label: "Aman",
    bar: "bg-emerald-600",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  hampir: {
    label: "Hampir habis",
    bar: "bg-amber-500",
    badge: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  },
  terlampaui: {
    label: "Terlampaui",
    bar: "bg-rose-600",
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
};

export function BudgetCard({ item, month }: { item: BudgetItem; month: string }) {
  const { usage } = item;
  const gaya = GAYA[usage.status];
  const lebar = Math.min(usage.percent, 100);

  return (
    <Link
      href={`/budget/${item.id}?bulan=${month}`}
      className="grid gap-2 rounded-xl border border-border px-4 py-3 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate font-medium">{item.label}</p>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", gaya.badge)}>{gaya.label}</span>
      </div>

      <div
        role="progressbar"
        aria-label={`Pemakaian budget ${item.label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={lebar}
        aria-valuetext={`${usage.percent}% terpakai`}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div className={cn("h-full rounded-full", gaya.bar)} style={{ width: `${lebar}%` }} />
      </div>

      <div className="flex items-baseline justify-between gap-3 text-sm">
        <p className="tabular-nums">
          {formatRupiah(usage.spent)} <span className="text-muted-foreground">dari {formatRupiah(usage.limit)}</span>
        </p>
        <p
          className={cn(
            "shrink-0 text-xs tabular-nums",
            usage.remaining < 0 ? "font-medium text-rose-700 dark:text-rose-400" : "text-muted-foreground",
          )}
        >
          {usage.remaining < 0 ? `Lewat ${formatRupiah(-usage.remaining)}` : `Sisa ${formatRupiah(usage.remaining)}`}
        </p>
      </div>
    </Link>
  );
}
