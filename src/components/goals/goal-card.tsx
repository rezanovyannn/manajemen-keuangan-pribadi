import { CircleCheck } from "lucide-react";
import Link from "next/link";

import { formatTanggal } from "@/lib/dates";
import type { GoalItem } from "@/lib/goals/query";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";

export function GoalCard({ goal }: { goal: GoalItem }) {
  const { progress, need } = goal;
  const kebutuhan =
    need.kind === "monthly"
      ? `Perlu ±${formatRupiah(need.amount)}/bulan agar tercapai tepat waktu`
      : need.kind === "overdue"
        ? "Tenggat sudah lewat"
        : null;

  return (
    <Link
      href={`/tujuan/${goal.id}`}
      className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-card px-4 py-3 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label={`${goal.name}, ${progress.percent}% tercapai`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate font-medium">{goal.name}</p>
        {progress.achieved ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <CircleCheck className="size-3.5" aria-hidden />
            Tercapai
          </span>
        ) : (
          goal.deadline && <span className="shrink-0 text-xs text-muted-foreground">Tenggat {formatTanggal(goal.deadline)}</span>
        )}
      </div>

      <div
        role="progressbar"
        aria-label={`Progress ${goal.name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div className={cn("h-full rounded-full", progress.achieved ? "bg-emerald-600" : "bg-[var(--series-income)]")} style={{ width: `${progress.percent}%` }} />
      </div>

      <div className="flex items-baseline justify-between gap-3 text-sm">
        <p className="tabular-nums">
          {formatRupiah(progress.saved)} <span className="text-muted-foreground">dari {formatRupiah(progress.target)}</span>
        </p>
        <p className="shrink-0 text-xs text-muted-foreground tabular-nums">{progress.percent}%</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Akun {goal.accountName}
        {!progress.achieved && ` · kurang ${formatRupiah(progress.remaining)}`}
      </p>
      {kebutuhan && !progress.achieved && (
        <p className={cn("text-xs font-medium", need.kind === "overdue" ? "text-rose-700 dark:text-rose-400" : "text-foreground")}>{kebutuhan}</p>
      )}
    </Link>
  );
}
