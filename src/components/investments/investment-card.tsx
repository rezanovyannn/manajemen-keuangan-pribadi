import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";

import { AccountIcon } from "@/components/accounts/account-icon";
import { investmentKindLabel } from "@/lib/accounts/types";
import { formatTanggal } from "@/lib/dates";
import type { InvestmentItem } from "@/lib/investments/query";
import { formatGainPercent, formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import { formatUnits } from "@/lib/validators/investment";

function bertanda(n: number) {
  return n > 0 ? `+${formatRupiah(n)}` : n < 0 ? `−${formatRupiah(-n)}` : formatRupiah(0);
}

// Kartu satu aset investasi: nilai sekarang, modal, untung/rugi, unit, tanggal nilai.
export function InvestmentCard({ item, asLink = true }: { item: InvestmentItem; asLink?: boolean }) {
  const naik = item.gain > 0;
  const turun = item.gain < 0;
  const isi = (
    <>
      <div className="flex items-center gap-3">
        <AccountIcon type="investment" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            {investmentKindLabel(item.kind)}
            {item.units ? ` · ${formatUnits(item.units)} unit` : ""}
          </p>
        </div>
        {asLink && <ChevronRight className="size-4 text-muted-foreground" aria-hidden />}
      </div>
      <div className="grid gap-0.5">
        <p className="text-xs text-muted-foreground">Nilai sekarang</p>
        <p className="text-2xl font-semibold tracking-tight tabular-nums" data-testid="investasi-nilai">
          {formatRupiah(item.value)}
        </p>
        <p
          className={cn(
            "flex items-center gap-1 text-sm font-medium tabular-nums",
            naik && "text-emerald-700 dark:text-emerald-400",
            turun && "text-rose-700 dark:text-rose-400",
            !naik && !turun && "text-muted-foreground",
          )}
          data-testid="investasi-untung"
        >
          {naik ? <TrendingUp className="size-4" aria-hidden /> : turun ? <TrendingDown className="size-4" aria-hidden /> : null}
          {bertanda(item.gain)}
          {item.gainTenths !== null && <span>({formatGainPercent(item.gainTenths)})</span>}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Modal {formatRupiah(item.cost)} · {item.lastValuedOn ? `nilai per ${formatTanggal(item.lastValuedOn)}` : "belum pernah diperbarui"}
      </p>
    </>
  );
  const kelas = "grid gap-3 rounded-xl border border-border bg-card p-4 lg:p-5";
  return asLink ? (
    <Link href={`/akun/${item.id}`} className={cn(kelas, "outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50")} aria-label={`${item.name}, nilai ${formatRupiah(item.value)}`}>
      {isi}
    </Link>
  ) : (
    <section className={kelas} aria-label={item.name}>
      {isi}
    </section>
  );
}
