import { TriangleAlert } from "lucide-react";
import Link from "next/link";

import { formatTanggal, formatTanggalPendek } from "@/lib/dates";
import { formatRupiah, type CashflowProjection } from "@/lib/money";
import { cn } from "@/lib/utils";

import { ProjectionChart } from "./projection-chart";

function bertanda(n: number) {
  return n > 0 ? `+${formatRupiah(n)}` : n < 0 ? `−${formatRupiah(-n)}` : formatRupiah(0);
}

// Proyeksi total saldo sampai akhir bulan dari jadwal berulang yang belum dicatat.
export function CashflowProjectionSection({
  projection: p,
  monthEnd,
  accountNames,
  hasRules,
}: {
  projection: CashflowProjection;
  monthEnd: string;
  accountNames: Record<string, string>;
  hasRules: boolean;
}) {
  const jadwal = p.points.filter((x) => x.items.length > 0);
  return (
    <section aria-labelledby="judul-proyeksi" className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 id="judul-proyeksi" className="font-medium">
          Proyeksi saldo sampai {formatTanggal(monthEnd)}
        </h2>
        <p className="text-xs text-muted-foreground">Dari saldo hari ini dan jadwal transaksi berulang yang belum dicatat.</p>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        <Kotak label="Saldo hari ini" value={formatRupiah(p.start)} />
        <Kotak label="Perkiraan akhir bulan" value={formatRupiah(p.end)} testId="proyeksi-akhir" />
        <Kotak label="Pemasukan terjadwal" value={`+${formatRupiah(p.income)}`} />
        <Kotak label="Tagihan terjadwal" value={`−${formatRupiah(p.expense)}`} />
      </dl>

      {p.shortfalls.length > 0 && (
        <div className="grid gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm" data-testid="proyeksi-minus">
          {p.shortfalls.map((s) => (
            <p key={s.accountId} className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
              <span>
                Saldo <span className="font-medium">{accountNames[s.accountId] ?? "akun"}</span> diperkirakan minus{" "}
                {formatRupiah(-s.balance)} pada {formatTanggalPendek(s.date)}. Pertimbangkan transfer sebelum tanggal itu.
              </span>
            </p>
          ))}
        </div>
      )}

      {jadwal.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-5 text-center text-sm text-muted-foreground">
          {hasRules ? "Tidak ada jadwal lagi sampai akhir bulan." : "Belum ada transaksi berulang. "}
          {!hasRules && (
            <Link href="/berulang" className="font-medium text-link underline underline-offset-4">
              Buat jadwal
            </Link>
          )}
        </p>
      ) : (
        <>
          <figure className="grid grid-cols-1 gap-1">
            <figcaption className="sr-only">Perkiraan total saldo per hari sampai akhir bulan</figcaption>
            <ProjectionChart data={p.points.map((x) => ({ date: x.date, balance: x.balance, count: x.items.length }))} />
          </figure>
          <ol className="grid grid-cols-1 divide-y divide-border text-sm" aria-label="Jadwal sampai akhir bulan">
            {jadwal.map((pt) => (
              <li key={pt.date} className="grid grid-cols-1 gap-1 py-2">
                <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                  <span>{formatTanggal(pt.date)}</span>
                  <span className="tabular-nums">Saldo: {formatRupiah(pt.balance)}</span>
                </div>
                {pt.items.map((o) => (
                  <div key={`${o.ruleId}-${o.dueDate}`} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {o.name}
                      <span className="text-muted-foreground"> · {accountNames[o.accountId] ?? "akun"}</span>
                      {o.overdue && <span className="text-amber-700 dark:text-amber-400"> · terlambat</span>}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 tabular-nums",
                        o.type === "income" ? "text-emerald-700 dark:text-emerald-400" : "",
                      )}
                    >
                      {bertanda(o.type === "income" ? o.amount : -o.amount)}
                    </span>
                  </div>
                ))}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function Kotak({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/50 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums" data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}
