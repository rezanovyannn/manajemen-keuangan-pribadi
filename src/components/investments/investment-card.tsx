import { ArrowDownRight, ArrowUpRight, ChevronRight, Clock } from "lucide-react";
import Link from "next/link";

import { AccountIcon } from "@/components/accounts/account-icon";
import { investmentKindLabel } from "@/lib/accounts/types";
import { formatTanggal, formatTanggalPendek } from "@/lib/dates";
import type { InvestmentItem } from "@/lib/investments/query";
import { formatGainPercent, formatRupiah } from "@/lib/money";
import { daysUntil } from "@/lib/recurring/schedule";
import { cn } from "@/lib/utils";
import { formatUnits } from "@/lib/validators/investment";

import { QuickValuationButton } from "./quick-valuation";

// Aset manual dianggap perlu diperbarui jika nilainya berumur lebih dari ini.
export const HARI_PERLU_UPDATE = 7;

function bertanda(n: number) {
  return n > 0 ? `+${formatRupiah(n)}` : n < 0 ? `−${formatRupiah(-n)}` : formatRupiah(0);
}

const warna = (n: number) =>
  n > 0 ? "text-emerald-700 dark:text-emerald-400" : n < 0 ? "text-rose-700 dark:text-rose-400" : "text-muted-foreground";

// Kartu satu aset investasi. Nilai mengikuti platform; untung/rugi belum terealisasi
// terhadap modal; untung terealisasi dari penjualan; naik/turun sejak pembaruan terakhir.
export function InvestmentCard({ item, today, asLink = true }: { item: InvestmentItem; today: string; asLink?: boolean }) {
  const umur = item.lastValuedOn ? -daysUntil(item.lastValuedOn, today) : null;
  const perluUpdate = item.value > 0 && (umur === null || umur > HARI_PERLU_UPDATE);
  const c = item.lastChange;

  return (
    <section className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-border bg-card p-4 lg:p-5" aria-label={item.name}>
      <div className="flex items-center gap-3">
        <AccountIcon type="investment" />
        <div className="min-w-0 flex-1">
          {asLink ? (
            <Link href={`/akun/${item.id}`} className="flex min-w-0 items-center gap-1 font-medium outline-none hover:underline focus-visible:underline">
              <span className="min-w-0 truncate">{item.name}</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          ) : (
            <p className="truncate font-medium">{item.name}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {investmentKindLabel(item.kind)}
            {item.units ? ` · ${formatUnits(item.units)} unit` : ""}
          </p>
        </div>
        {asLink && <QuickValuationButton accountId={item.id} name={item.name} today={today} lastUnits={item.units} />}
      </div>

      <div className="grid gap-0.5">
        <p className="text-xs text-muted-foreground">Nilai sekarang</p>
        <p className="text-2xl font-semibold tracking-tight tabular-nums" data-testid="investasi-nilai">
          {formatRupiah(item.value)}
        </p>
        {c && c.change !== 0 && (
          <p className={cn("flex items-center gap-1 text-sm font-medium tabular-nums", warna(c.change))} data-testid="investasi-perubahan">
            {c.change > 0 ? <ArrowUpRight className="size-4" aria-hidden /> : <ArrowDownRight className="size-4" aria-hidden />}
            {c.change > 0 ? "Naik" : "Turun"} {formatRupiah(Math.abs(c.change))}
            {c.changeTenths !== null && ` (${formatGainPercent(c.changeTenths)})`}
            <span className="font-normal text-muted-foreground"> · {formatTanggalPendek(c.date)}</span>
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <dt className="text-xs text-muted-foreground">Modal</dt>
          <dd className="font-semibold tabular-nums">{formatRupiah(item.cost)}</dd>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <dt className="text-xs text-muted-foreground">Untung/rugi</dt>
          <dd className={cn("font-semibold tabular-nums", warna(item.unrealized))} data-testid="investasi-untung">
            {bertanda(item.unrealized)}
            {item.unrealizedTenths !== null && <span className="font-medium"> ({formatGainPercent(item.unrealizedTenths)})</span>}
          </dd>
        </div>
      </dl>

      {item.realized !== 0 && (
        <p className="text-xs text-muted-foreground" data-testid="investasi-terealisasi">
          {item.realized > 0 ? "Untung" : "Rugi"} terealisasi dari penjualan:{" "}
          <span className={cn("font-semibold tabular-nums", warna(item.realized))}>{bertanda(item.realized)}</span>
        </p>
      )}

      <p className={cn("flex items-center gap-1.5 text-xs", perluUpdate ? "font-medium text-amber-800 dark:text-amber-300" : "text-muted-foreground")}>
        {perluUpdate && <Clock className="size-3.5 shrink-0" aria-hidden />}
        {item.lastValuedOn
          ? perluUpdate
            ? `Belum diperbarui ${umur} hari · nilai per ${formatTanggal(item.lastValuedOn)}`
            : `Nilai per ${formatTanggal(item.lastValuedOn)}`
          : "Belum pernah diperbarui · nilai = modal"}
      </p>
    </section>
  );
}
