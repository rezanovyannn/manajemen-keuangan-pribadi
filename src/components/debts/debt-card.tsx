import { CircleCheck } from "lucide-react";
import Link from "next/link";

import { formatTanggal } from "@/lib/dates";
import type { DebtItem } from "@/lib/debts/query";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";

export function DebtCard({ debt }: { debt: DebtItem }) {
  const { status } = debt;
  return (
    <Link
      href={`/utang/${debt.id}`}
      className="grid grid-cols-1 gap-2 rounded-xl border border-border px-4 py-3 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label={`${debt.name}, sisa ${formatRupiah(status.remaining)}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate font-medium">{debt.name}</p>
        {status.settled ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <CircleCheck className="size-3.5" aria-hidden />
            Lunas
          </span>
        ) : (
          <p className="shrink-0 font-semibold tabular-nums">{formatRupiah(status.remaining)}</p>
        )}
      </div>
      <div
        role="progressbar"
        aria-label={`Terbayar ${debt.name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={status.percent}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div className={cn("h-full rounded-full", status.settled ? "bg-emerald-600" : "bg-[var(--series-income)]")} style={{ width: `${status.percent}%` }} />
      </div>
      <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground tabular-nums">
        <span>
          {status.percent}% {debt.kind === "utang" ? "lunas" : "kembali"} · {formatRupiah(status.paid)} dari {formatRupiah(status.principal)}
        </span>
        {debt.installmentAmount && <span>Cicilan {formatRupiah(debt.installmentAmount)}/bulan</span>}
        {debt.dueDate && !status.settled && <span>Tenggat {formatTanggal(debt.dueDate)}</span>}
        {debt.counterparty && <span>{debt.counterparty}</span>}
      </p>
    </Link>
  );
}
