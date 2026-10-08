import { ArrowDownRight, ArrowUpRight, Repeat, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { formatTanggalPendek } from "@/lib/dates";
import type { InsightsData } from "@/lib/insight/insights";
import { formatRupiah, INSIGHT } from "@/lib/money";
import { cn } from "@/lib/utils";

// Tiga kartu insight tanpa AI. Setiap kartu menjelaskan aturannya agar mudah dipercaya.
export function InsightCards({ data, today }: { data: InsightsData; today: string }) {
  const hari = Number(today.slice(8, 10));
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-5">
      <Kartu
        id="insight-perubahan"
        Icon={TrendingUp}
        judul="Perubahan pengeluaran"
        aturan={`Bulan ini (tgl 1–${hari}) dibanding rata-rata periode yang sama ${data.changes[0]?.baselineMonths ?? INSIGHT.bulanPembanding} bulan terakhir. Tampil jika berubah ≥ ${INSIGHT.persenBerubah}%.`}
        kosong="Pengeluaran bulan ini masih sesuai kebiasaan."
      >
        {data.changes.map((c) => {
          const naik = c.percent > 0;
          const Ikon = naik ? ArrowUpRight : ArrowDownRight;
          return (
            <li key={c.categoryId} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.label}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatRupiah(c.current)} · <span className="whitespace-nowrap">biasanya {formatRupiah(c.average)}</span>
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                  naik ? "bg-rose-500/10 text-rose-700 dark:text-rose-300" : "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
                )}
              >
                <Ikon className="size-3.5" aria-hidden />
                {naik ? "naik" : "turun"} {Math.abs(c.percent)}%
              </span>
            </li>
          );
        })}
      </Kartu>

      <Kartu
        id="insight-tidak-biasa"
        Icon={Sparkles}
        judul="Pengeluaran tidak biasa"
        aturan={`Transaksi bulan ini lebih dari ${INSIGHT.kaliMedian}× nilai tengah kategorinya (3 bulan terakhir), minimal ${formatRupiah(INSIGHT.minTidakBiasa)}.`}
        kosong="Tidak ada pengeluaran yang jauh di atas kebiasaan."
      >
        {data.unusual.map((u) => (
          <li key={u.id}>
            <Link
              href={`/transaksi/${u.id}`}
              className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 outline-none hover:bg-muted/50 focus-visible:bg-muted"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{u.note || u.label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatTanggalPendek(u.occurredOn)} · {u.label} · ±{u.times}× biasanya ({formatRupiah(u.median)})
                </p>
              </div>
              <span className="shrink-0 font-medium tabular-nums">{formatRupiah(u.amount)}</span>
            </Link>
          </li>
        ))}
      </Kartu>

      <Kartu
        id="insight-langganan"
        Icon={Repeat}
        judul="Kemungkinan langganan"
        aturan={`Catatan dan nominal yang sama muncul ≥ ${INSIGHT.minBulanBerturut} bulan berturut-turut, tapi belum dijadikan jadwal berulang.`}
        kosong="Tidak ada langganan yang terlewat. Semua tagihan rutin sudah terjadwal."
      >
        {data.subscriptions.map((s) => (
          <li key={s.latestId} className="grid grid-cols-1 gap-2 py-2.5">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.note}</p>
                <p className="text-xs text-muted-foreground">
                  {s.months} bulan berturut-turut · {s.accountName} · berikutnya ± {formatTanggalPendek(s.nextDate)}
                </p>
              </div>
              <span className="shrink-0 font-medium tabular-nums">{formatRupiah(s.amount)}</span>
            </div>
            <Link
              href={`/berulang/baru?dariTransaksi=${s.latestId}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 justify-self-start md:h-8")}
              aria-label={`Jadikan jadwal berulang: ${s.note}`}
            >
              <Repeat aria-hidden />
              Jadikan jadwal berulang
            </Link>
          </li>
        ))}
      </Kartu>
    </div>
  );
}

function Kartu({
  id,
  Icon,
  judul,
  aturan,
  kosong,
  children,
}: {
  id: string;
  Icon: typeof TrendingUp;
  judul: string;
  aturan: string;
  kosong: string;
  children: React.ReactNode[];
}) {
  return (
    <section aria-labelledby={id} className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-card p-4 lg:p-5">
      <h2 id={id} className="flex items-center gap-2 font-semibold">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        {judul}
      </h2>
      <p className="text-xs text-muted-foreground">{aturan}</p>
      {children.length === 0 ? (
        <p className="rounded-lg bg-muted/50 px-3 py-3 text-sm text-muted-foreground">{kosong}</p>
      ) : (
        <ul className="divide-y divide-border">{children}</ul>
      )}
    </section>
  );
}
